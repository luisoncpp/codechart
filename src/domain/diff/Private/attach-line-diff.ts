import type { GraphDiffOverlay } from "./types";
import { lineDiffsFromUnified } from "./parse-line-diff";

export function attachLineDiff(
  partial: Omit<GraphDiffOverlay, "unifiedDiff" | "lineDiffByPath">,
  unifiedDiff: string | null,
): GraphDiffOverlay {
  const lineDiffByPath = unifiedDiff ? lineDiffsFromUnified(unifiedDiff) : new Map();
  return { ...partial, unifiedDiff, lineDiffByPath };
}
