import type { GitCommit } from "../../../ipc/git-client";

/** Git log order: index 0 is newest; parent of `commits[i]` is `commits[i + 1]`. */
export function parentCommitHash(
  commits: GitCommit[],
  headHash: string,
): string | null {
  const idx = commits.findIndex((c) => c.hash === headHash);
  if (idx < 0 || idx + 1 >= commits.length) return null;
  return commits[idx + 1].hash;
}
