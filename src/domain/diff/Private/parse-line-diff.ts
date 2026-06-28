import { normalizeDiffPath } from "./parse-unified-diff";
import type { FileLineDiff } from "./line-diff-types";

interface FileBuilder {
  added: Set<number>;
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
    if (!builder || !currentPath) continue;

    if (raw.startsWith("--- ") || raw.startsWith("+++ ")) {
      const path = parseHeaderPath(raw.slice(4));
      if (path && path !== "/dev/null") currentPath = path;
      continue;
    }

    const hunk = parseHunkHeader(raw);
    if (hunk) {
      builder.oldLine = hunk.oldStart;
      builder.newLine = hunk.newStart;
      builder.inHunk = true;
      continue;
    }

    if (!builder.inHunk) continue;
    if (raw.startsWith("\\")) continue;

    const prefix = raw[0];
    const content = raw.slice(1);
    if (prefix === " ") {
      builder.oldLine++;
      builder.newLine++;
    } else if (prefix === "-") {
      pushRemove(builder, content);
      builder.oldLine++;
    } else if (prefix === "+") {
      builder.added.add(builder.newLine);
      builder.newLine++;
    }
  }
  flushFile(out, currentPath, builder);
  return out;
}

function newFileBuilder(): FileBuilder {
  return {
    added: new Set(),
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
    removeBeforeLine: builder.removeBefore,
  });
}

function pathFromDiffGit(line: string): string | null {
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (!match) return null;
  return normalizeDiffPath(match[2]!);
}

function parseHeaderPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "/dev/null") return "/dev/null";
  return normalizeDiffPath(trimmed.replace(/^(a|b)\//, ""));
}

function parseHunkHeader(line: string): { oldStart: number; newStart: number } | null {
  const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (!match) return null;
  return { oldStart: Number(match[1]), newStart: Number(match[2]) };
}
