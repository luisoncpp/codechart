import type { ParsedDiffPaths } from "./types";

/** Normalize a path from a diff header (`a/foo`, `b/foo`, `foo`). */
export function normalizeDiffPath(raw: string): string {
  let path = raw.trim();
  if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
  if (path.startsWith("a/") || path.startsWith("b/")) path = path.slice(2);
  return path.replace(/\\/g, "/");
}

/** Extract repo-relative file paths touched by a unified diff. */
export function pathsFromUnifiedDiff(text: string): ParsedDiffPaths {
  const modified = new Set<string>();
  const deleted = new Set<string>();
  const added = new Set<string>();

  let oldPath: string | null = null;
  let newPath: string | null = null;

  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      flushFile(oldPath, newPath, modified, deleted, added);
      oldPath = null;
      newPath = null;
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match) {
        oldPath = normalizeDiffPath(match[1]!);
        newPath = normalizeDiffPath(match[2]!);
      }
      continue;
    }
    if (line.startsWith("--- ")) {
      const p = parseDiffHeaderPath(line.slice(4));
      if (p === "/dev/null") oldPath = "/dev/null";
      else if (p) oldPath = p;
      continue;
    }
    if (line.startsWith("+++ ")) {
      const p = parseDiffHeaderPath(line.slice(4));
      if (p === "/dev/null") newPath = "/dev/null";
      else if (p) newPath = p;
    }
  }
  flushFile(oldPath, newPath, modified, deleted, added);

  return {
    modified: [...modified],
    deleted: [...deleted],
    added: [...added],
  };
}

function parseDiffHeaderPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "/dev/null") return "/dev/null";
  if (trimmed.startsWith("a/") || trimmed.startsWith("b/")) {
    return normalizeDiffPath(trimmed);
  }
  return normalizeDiffPath(trimmed);
}

function flushFile(
  oldPath: string | null,
  newPath: string | null,
  modified: Set<string>,
  deleted: Set<string>,
  added: Set<string>,
) {
  if (!oldPath && !newPath) return;
  if (oldPath === "/dev/null" && newPath) {
    added.add(newPath);
    return;
  }
  if (newPath === "/dev/null" && oldPath) {
    deleted.add(oldPath);
    return;
  }
  const path = newPath ?? oldPath;
  if (!path) return;
  if (oldPath && newPath && oldPath !== newPath) {
    deleted.add(oldPath);
    added.add(newPath);
    return;
  }
  modified.add(path);
}
