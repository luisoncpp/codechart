import type { FileLineDiff } from "./line-diff-types";

export interface LineDiffStats {
  added: number;
  removed: number;
}

/** Count added and removed lines from a parsed unified-diff section. */
export function countLineDiffStats(fileDiff: FileLineDiff): LineDiffStats {
  let removed = 0;
  for (const rows of fileDiff.removeBeforeLine.values()) removed += rows.length;
  return { added: fileDiff.addedLineNumbers.size, removed };
}

/** Plain-text suffix length for label fitting (` +12 -3`). */
export function diffStatsSuffixLength(stats: LineDiffStats): number {
  if (stats.added === 0 && stats.removed === 0) return 0;
  let len = 0;
  if (stats.added > 0) len += 1 + String(stats.added).length + 1; // space +N
  if (stats.removed > 0) len += 1 + String(stats.removed).length + 1; // space -M
  return len;
}
