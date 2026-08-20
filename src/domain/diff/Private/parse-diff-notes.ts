// @Architecture(descriptionShort="Parses Diff Note markers (# ...) from unified diffs into bound DiffNotes")
import { parseHeaderPath, parseHunkHeader, pathFromDiffGit } from "./parse-line-diff";
import type { DiffNote, DiffNoteParseResult, DiffNoteSide } from "./types";

interface PrefixRun {
  prefix: string;
  side: DiffNoteSide;
  startLine: number;
  endLine: number;
}

interface ParseContext {
  notes: DiffNote[];
  droppedLines: string[];
  pendingMarkers: string[];
  currentPath: string | null;
  currentRun: PrefixRun | null;
  oldLine: number;
  newLine: number;
  inHunk: boolean;
}

/** Parse Diff Note markers (`# ...` in column 0) from unified diff text. */
export function parseDiffNotes(text: string): DiffNoteParseResult {
  const ctx = newParseContext();
  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith("diff --git ")) {
      handleDiffGit(ctx, raw);
      continue;
    }
    if (raw.startsWith("--- ") || raw.startsWith("+++ ")) {
      handlePathHeader(ctx, raw);
      continue;
    }
    const hunk = parseHunkHeader(raw);
    if (hunk) {
      handleHunkHeader(ctx, hunk);
      continue;
    }
    if (!ctx.inHunk) {
      if (raw.startsWith("#")) ctx.droppedLines.push(raw);
      continue;
    }
    handleHunkLine(ctx, raw);
  }
  flushMarkers(ctx);
  return { notes: ctx.notes, droppedMarkerText: ctx.droppedLines.join("\n") };
}

function newParseContext(): ParseContext {
  return {
    notes: [],
    droppedLines: [],
    pendingMarkers: [],
    currentPath: null,
    currentRun: null,
    oldLine: 1,
    newLine: 1,
    inHunk: false,
  };
}

function handleDiffGit(ctx: ParseContext, line: string) {
  flushMarkers(ctx);
  ctx.currentPath = pathFromDiffGit(line);
  ctx.currentRun = null;
  ctx.inHunk = false;
}

function handlePathHeader(ctx: ParseContext, line: string) {
  const path = parseHeaderPath(line.slice(4));
  if (path && path !== "/dev/null") ctx.currentPath = path;
}

function handleHunkHeader(
  ctx: ParseContext,
  hunk: { oldStart: number; newStart: number },
) {
  flushMarkers(ctx);
  ctx.oldLine = hunk.oldStart;
  ctx.newLine = hunk.newStart;
  ctx.inHunk = true;
  ctx.currentRun = null;
}

function handleHunkLine(ctx: ParseContext, raw: string) {
  if (raw.startsWith("#")) {
    ctx.pendingMarkers.push(raw);
    return;
  }
  flushMarkers(ctx);
  if (raw.startsWith("\\")) return;
  const prefix = raw[0];
  if (prefix === " ") {
    extendOrStartRun(ctx, " ", "after", ctx.newLine);
    ctx.oldLine++;
    ctx.newLine++;
  } else if (prefix === "-") {
    extendOrStartRun(ctx, "-", "before", ctx.oldLine);
    ctx.oldLine++;
  } else if (prefix === "+") {
    extendOrStartRun(ctx, "+", "after", ctx.newLine);
    ctx.newLine++;
  }
}

function extendOrStartRun(
  ctx: ParseContext,
  prefix: string,
  side: DiffNoteSide,
  line: number,
) {
  if (ctx.currentRun && ctx.currentRun.prefix === prefix) {
    ctx.currentRun.endLine = line;
    return;
  }
  ctx.currentRun = { prefix, side, startLine: line, endLine: line };
}

function flushMarkers(ctx: ParseContext) {
  if (ctx.pendingMarkers.length === 0) return;
  const markers = ctx.pendingMarkers;
  ctx.pendingMarkers = [];
  if (!ctx.currentRun || !ctx.currentPath) {
    ctx.droppedLines.push(...markers);
    return;
  }
  const body = markers.map((l) => l.replace(/^# ?/, "")).join("\n");
  if (body.trim().length === 0) {
    ctx.droppedLines.push(...markers);
    ctx.currentRun = null;
    return;
  }
  ctx.notes.push({
    path: ctx.currentPath,
    startLine: ctx.currentRun.startLine,
    endLine: ctx.currentRun.endLine,
    side: ctx.currentRun.side,
    body,
  });
  ctx.currentRun = null;
}

