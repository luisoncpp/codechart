// @Architecture(descriptionShort="Extracts added, modified, and deleted paths from unified diffs")
import type { ParsedDiffPaths } from "./types";

/** Normalize a path from a diff header (`a/foo`, `b/foo`, `foo`). */
export function normalizeDiffPath(raw: string): string {
  let path = raw.trim();
  if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
  if (path.startsWith("a/") || path.startsWith("b/")) path = path.slice(2);
  return path.replace(/\\/g, "/");
}

interface PathBuckets {
  modified: Set<string>;
  deleted: Set<string>;
  added: Set<string>;
}

interface DiffPathState {
  oldPath: string | null;
  newPath: string | null;
}

/** Extract repo-relative file paths touched by a unified diff. */
export function pathsFromUnifiedDiff(text: string): ParsedDiffPaths {
  const buckets: PathBuckets = {
    modified: new Set(),
    deleted: new Set(),
    added: new Set(),
  };
  const state: DiffPathState = { oldPath: null, newPath: null };

  for (const line of text.split(/\r?\n/)) {
    processDiffLine(line, state, buckets);
  }
  applyFilePaths(state.oldPath, state.newPath, buckets);

  return {
    modified: [...buckets.modified],
    deleted: [...buckets.deleted],
    added: [...buckets.added],
  };
}

function processDiffLine(line: string, state: DiffPathState, buckets: PathBuckets): void {
  if (line.startsWith("diff --git ")) {
    applyFilePaths(state.oldPath, state.newPath, buckets);
    state.oldPath = null;
    state.newPath = null;
    const gitPaths = pathsFromDiffGitLine(line);
    if (gitPaths) {
      state.oldPath = gitPaths.oldPath;
      state.newPath = gitPaths.newPath;
    }
    return;
  }
  if (line.startsWith("--- ")) {
    const updated = headerPathUpdate(line.slice(4));
    if (updated !== undefined) state.oldPath = updated;
    return;
  }
  if (line.startsWith("+++ ")) {
    const updated = headerPathUpdate(line.slice(4));
    if (updated !== undefined) state.newPath = updated;
  }
}

function pathsFromDiffGitLine(line: string): { oldPath: string; newPath: string } | null {
  const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
  if (!match) return null;
  return {
    oldPath: normalizeDiffPath(match[1]!),
    newPath: normalizeDiffPath(match[2]!),
  };
}

function parseDiffHeaderPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "/dev/null") return "/dev/null";
  const path = normalizeDiffPath(trimmed);
  return path || null;
}

/** Returns `undefined` when the header line does not update the path. */
function headerPathUpdate(raw: string): string | null | undefined {
  const path = parseDiffHeaderPath(raw);
  if (path === null) return undefined;
  return path;
}

function applyFilePaths(
  oldPath: string | null,
  newPath: string | null,
  buckets: PathBuckets,
): void {
  if (!oldPath && !newPath) return;
  if (oldPath === "/dev/null" && newPath) {
    buckets.added.add(newPath);
    return;
  }
  if (newPath === "/dev/null" && oldPath) {
    buckets.deleted.add(oldPath);
    return;
  }
  if (oldPath && newPath && oldPath !== newPath) {
    buckets.deleted.add(oldPath);
    buckets.added.add(newPath);
    return;
  }
  const path = newPath ?? oldPath;
  if (path) buckets.modified.add(path);
}
