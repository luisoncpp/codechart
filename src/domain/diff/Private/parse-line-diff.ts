// @Architecture(descriptionShort="Parses unified diff hunks into per-file line add/remove maps")
import { normalizeDiffPath } from "./parse-unified-diff";
import type { FileLineDiff } from "./line-diff-types";

interface FileBuilder {
  added: Set<number>;
  removed: Set<number>;
  removeBefore: Map<number, string[]>;
  oldLine: number;
  newLine: number;
  inHunk: boolean;
}

/** Parse unified diff text into per-file line-level add/remove maps. */
export function lineDiffsFromUnified(text: string): Map<string, FileLineDiff> {
  const out = new Map<string, FileLineDiff>();
  let currentPath: string | null = null;
  let builder: FileBuilder | null = null;

  for (const raw of text.split(/\r?\n/)) {
    if (raw.startsWith("diff --git ")) {
      flushFile(out, currentPath, builder);
      currentPath = pathFromDiffGit(raw);
      builder = newFileBuilder();
      continue;
    }
    const headerPath = parseHeaderPathLine(raw);
    if (headerPath) {
      if (!builder || currentPath !== headerPath) {
        flushFile(out, currentPath, builder);
        currentPath = headerPath;
        builder = newFileBuilder();
      }
      continue;
    }
    if (!builder || !currentPath) continue;
    consumeDiffLine(raw, builder);
  }
  flushFile(out, currentPath, builder);
  return out;
}

function parseHeaderPathLine(raw: string): string | null {
  if (!raw.startsWith("--- ") && !raw.startsWith("+++ ")) return null;
  const path = parseHeaderPath(raw.slice(4));
  return path && path !== "/dev/null" ? path : null;
}

function consumeDiffLine(raw: string, builder: FileBuilder): void {
  const hunk = parseHunkHeader(raw);
  if (hunk) {
    builder.oldLine = hunk.oldStart;
    builder.newLine = hunk.newStart;
    builder.inHunk = true;
    return;
  }
  if (!builder.inHunk || raw.startsWith("\\") || raw.startsWith("#")) return;
  if (raw.startsWith("-")) {
    pushRemove(builder, raw.slice(1));
    builder.removed.add(builder.oldLine++);
    return;
  }
  if (raw.startsWith("+")) {
    builder.added.add(builder.newLine++);
    return;
  }
  builder.oldLine++;
  builder.newLine++;
}

function newFileBuilder(): FileBuilder {
  return {
    added: new Set(),
    removed: new Set(),
    removeBefore: new Map(),
    oldLine: 1,
    newLine: 1,
    inHunk: false,
  };
}

function pushRemove(builder: FileBuilder, content: string) {
  const key = builder.newLine;
  const bucket = builder.removeBefore.get(key);
  if (bucket) bucket.push(content);
  else builder.removeBefore.set(key, [content]);
}

function flushFile(
  out: Map<string, FileLineDiff>,
  path: string | null,
  builder: FileBuilder | null,
) {
  if (!path || !builder) return;
  if (builder.added.size === 0 && builder.removeBefore.size === 0) return;
  out.set(path, {
    addedLineNumbers: builder.added,
    removedLineNumbers: builder.removed,
    removeBeforeLine: builder.removeBefore,
  });
}

export function pathFromDiffGit(line: string): string | null {
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (!match) return null;
  return normalizeDiffPath(match[2]!);
}

export function parseHeaderPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "/dev/null") return "/dev/null";
  return normalizeDiffPath(trimmed.replace(/^(a|b)\//, ""));
}

export function parseHunkHeader(line: string): { oldStart: number; newStart: number } | null {
  const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (!match) return null;
  return { oldStart: Number(match[1]), newStart: Number(match[2]) };
}
