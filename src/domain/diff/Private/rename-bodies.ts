// @Architecture(descriptionShort="Rebuilds old/new file bodies from unified diff hunks")
import { normalizeDiffPath } from "./parse-unified-diff";

/** Per-path source reconstructed from unified-diff hunks. */
export interface DiffBodies {
  old: Map<string, string>;
  new: Map<string, string>;
}

interface FileAcc {
  oldPath: string | null;
  newPath: string | null;
  oldLines: string[];
  newLines: string[];
  inHunk: boolean;
}

/** Collect old and new file text from `+`/`-`/context hunks. */
export function bodiesFromUnifiedDiff(text: string): DiffBodies {
  const out: DiffBodies = { old: new Map(), new: new Map() };
  let acc: FileAcc | null = null;
  for (const raw of text.split(/\r?\n/)) {
    acc = consumeLine(raw, acc, out);
  }
  flushBodies(acc, out);
  return out;
}

function consumeLine(raw: string, acc: FileAcc | null, out: DiffBodies): FileAcc | null {
  if (raw.startsWith("diff --git ")) {
    flushBodies(acc, out);
    return newAcc(raw);
  }
  if (isPathHeader(raw)) {
    const current = acc ?? newBlankAcc();
    applyPathHeader(raw, current);
    return current;
  }
  if (!acc) return null;
  if (isHunkHeader(raw)) {
    acc.inHunk = true;
    return acc;
  }
  if (acc.inHunk && !isSkippableHunkLine(raw)) {
    pushHunkLine(raw, acc);
  }
  return acc;
}

function isPathHeader(raw: string): boolean {
  return raw.startsWith("--- ") || raw.startsWith("+++ ");
}

function isHunkHeader(raw: string): boolean {
  return raw.startsWith("@@ ") || raw.startsWith("@@\t") || /^@@ -\d+/.test(raw);
}

function isSkippableHunkLine(raw: string): boolean {
  return raw.startsWith("\\") || raw.startsWith("#");
}

function newAcc(gitLine: string): FileAcc {
  const match = gitLine.match(/^diff --git a\/(.+?) b\/(.+)$/);
  return {
    oldPath: match ? normalizeDiffPath(match[1]!) : null,
    newPath: match ? normalizeDiffPath(match[2]!) : null,
    oldLines: [],
    newLines: [],
    inHunk: false,
  };
}

function newBlankAcc(): FileAcc {
  return {
    oldPath: null,
    newPath: null,
    oldLines: [],
    newLines: [],
    inHunk: false,
  };
}

function applyPathHeader(raw: string, acc: FileAcc): boolean {
  if (raw.startsWith("--- ")) {
    const path = headerPath(raw.slice(4));
    if (path !== undefined) acc.oldPath = path;
    return true;
  }
  if (!raw.startsWith("+++ ")) return false;
  const path = headerPath(raw.slice(4));
  if (path !== undefined) acc.newPath = path;
  return true;
}

function headerPath(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "/dev/null") return "/dev/null";
  const path = normalizeDiffPath(trimmed);
  return path || undefined;
}

function pushHunkLine(raw: string, acc: FileAcc): void {
  if (raw.startsWith("-")) {
    acc.oldLines.push(raw.slice(1));
    return;
  }
  if (raw.startsWith("+")) {
    acc.newLines.push(raw.slice(1));
    return;
  }
  const content = raw.startsWith(" ") ? raw.slice(1) : raw;
  acc.oldLines.push(content);
  acc.newLines.push(content);
}

function flushBodies(acc: FileAcc | null, out: DiffBodies): void {
  if (!acc) return;
  storeBody(out.old, acc.oldPath, acc.oldLines);
  storeBody(out.new, acc.newPath, acc.newLines);
}

function storeBody(map: Map<string, string>, path: string | null, lines: string[]): void {
  if (!path || path === "/dev/null" || lines.length === 0) return;
  map.set(path, lines.join("\n"));
}
