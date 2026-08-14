// @Architecture(descriptionShort="Extracts added, modified, deleted, and renamed paths from unified diffs")
import type { ParsedDiffPaths, RenamePair } from "./types";

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
  renames: RenamePair[];
}

interface DiffPathState {
  oldPath: string | null;
  newPath: string | null;
  isCopy: boolean;
}

/** Extract repo-relative file paths touched by a unified diff. */
export function pathsFromUnifiedDiff(text: string): ParsedDiffPaths {
  const buckets: PathBuckets = {
    modified: new Set(),
    deleted: new Set(),
    added: new Set(),
    renames: [],
  };
  const state: DiffPathState = { oldPath: null, newPath: null, isCopy: false };

  for (const line of text.split(/\r?\n/)) {
    processDiffLine(line, state, buckets);
  }
  applyFilePaths(state, buckets);

  return {
    modified: [...buckets.modified],
    deleted: [...buckets.deleted],
    added: [...buckets.added],
    renames: buckets.renames,
  };
}

function processDiffLine(line: string, state: DiffPathState, buckets: PathBuckets): void {
  if (line.startsWith("diff --git ")) {
    applyFilePaths(state, buckets);
    resetPathState(state, line);
    return;
  }
  applyModeLine(line, state);
}

function resetPathState(state: DiffPathState, gitLine: string): void {
  state.oldPath = null;
  state.newPath = null;
  state.isCopy = false;
  const gitPaths = pathsFromDiffGitLine(gitLine);
  if (!gitPaths) return;
  state.oldPath = gitPaths.oldPath;
  state.newPath = gitPaths.newPath;
}

function applyModeLine(line: string, state: DiffPathState): void {
  if (line.startsWith("deleted file mode ")) {
    state.newPath = "/dev/null";
    return;
  }
  if (line.startsWith("new file mode ")) {
    state.oldPath = "/dev/null";
    return;
  }
  if (line.startsWith("copy from ") || line.startsWith("copy to ")) {
    state.isCopy = true;
    return;
  }
  if (line.startsWith("--- ")) {
    const updated = headerPathUpdate(line.slice(4));
    if (updated !== undefined) state.oldPath = updated;
    return;
  }
  if (!line.startsWith("+++ ")) return;
  const updated = headerPathUpdate(line.slice(4));
  if (updated !== undefined) state.newPath = updated;
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

function applyFilePaths(state: DiffPathState, buckets: PathBuckets): void {
  const { oldPath, newPath, isCopy } = state;
  if (!oldPath && !newPath) return;
  if (isCopy) {
    addPath(newPath, buckets);
    return;
  }
  classifyPathChange(oldPath, newPath, buckets);
}

function classifyPathChange(
  oldPath: string | null,
  newPath: string | null,
  buckets: PathBuckets,
): void {
  if (oldPath === "/dev/null") {
    addPath(newPath, buckets);
    return;
  }
  if (newPath === "/dev/null") {
    deletePath(oldPath, buckets);
    return;
  }
  recordRenameOrModify(oldPath, newPath, buckets);
}

function addPath(path: string | null, buckets: PathBuckets): void {
  if (path && path !== "/dev/null") buckets.added.add(path);
}

function deletePath(path: string | null, buckets: PathBuckets): void {
  if (path) buckets.deleted.add(path);
}

function recordRenameOrModify(
  oldPath: string | null,
  newPath: string | null,
  buckets: PathBuckets,
): void {
  if (oldPath && newPath && oldPath !== newPath) {
    buckets.deleted.add(oldPath);
    buckets.added.add(newPath);
    buckets.renames.push({ from: oldPath, to: newPath });
    return;
  }
  const path = newPath ?? oldPath;
  if (path) buckets.modified.add(path);
}
