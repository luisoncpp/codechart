// @Architecture(descriptionShort="Parses a pasted unified diff into per-file hunks of context/add/remove rows")
import { parseHeaderPath, parseHunkHeader, pathFromDiffGit } from "./parse-line-diff";
import { scanDiffLines, type DiffLine } from "./scan-diff-lines";

export type HunkRowKind = "ctx" | "add" | "del";

export interface HunkRow {
  kind: HunkRowKind;
  text: string;
}

export interface PasteHunk {
  oldStart: number;
  newStart: number;
  rows: HunkRow[];
}

/** Hunks per after-path; deleted files (`+++ /dev/null`) are left out. */
export function pasteHunksByPath(text: string): Map<string, PasteHunk[]> {
  const state: ParseState = { out: new Map(), hunks: null, hunk: null };
  for (const line of scanDiffLines(text)) consumeLine(state, line);
  for (const list of state.out.values()) list.forEach(trimTrailingBlankRows);
  return state.out;
}

interface ParseState {
  out: Map<string, PasteHunk[]>;
  /** Hunks of the current file section; null outside a usable section. */
  hunks: PasteHunk[] | null;
  hunk: PasteHunk | null;
}

function consumeLine(state: ParseState, line: DiffLine): void {
  const path = fileBoundaryPath(line.text, line.header);
  if (path !== undefined) {
    state.hunk = null;
    state.hunks = path ? sectionFor(state.out, path) : null;
    return;
  }
  if (line.header || !state.hunks) return;
  const header = parseHunkHeader(line.text);
  if (header) {
    state.hunk = { ...header, rows: [] };
    state.hunks.push(state.hunk);
    return;
  }
  const row = state.hunk ? hunkRow(line.text) : null;
  if (row) state.hunk!.rows.push(row);
}

/** `undefined` = not a boundary; `null` = a boundary with no usable after-path. */
function fileBoundaryPath(raw: string, header: string | null): string | null | undefined {
  if (raw.startsWith("diff --git ")) return pathFromDiffGit(raw);
  if (header !== "new") return undefined;
  const path = parseHeaderPath(raw.slice(4));
  return path && path !== "/dev/null" ? path : null;
}

function sectionFor(out: Map<string, PasteHunk[]>, path: string): PasteHunk[] {
  const existing = out.get(path);
  if (existing) return existing;
  const created: PasteHunk[] = [];
  out.set(path, created);
  return created;
}

/** Same relaxed rule as `parse-line-diff`: anything not `+`/`-`/`#`/`\` is context. */
function hunkRow(raw: string): HunkRow | null {
  if (raw.startsWith("\\") || raw.startsWith("#")) return null;
  if (raw.startsWith("+")) return { kind: "add", text: raw.slice(1) };
  if (raw.startsWith("-")) return { kind: "del", text: raw.slice(1) };
  return { kind: "ctx", text: raw.startsWith(" ") ? raw.slice(1) : raw };
}

/** A paste's trailing newline reads as one more empty context row; drop it. */
function trimTrailingBlankRows(hunk: PasteHunk): void {
  const last = (): HunkRow | undefined => hunk.rows[hunk.rows.length - 1];
  while (last()?.kind === "ctx" && last()!.text === "") hunk.rows.pop();
}
