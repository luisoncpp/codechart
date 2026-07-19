// @Architecture(descriptionShort="Attaches parsed line-level diff data to a graph overlay")
import type { GraphDiffOverlay } from "./types";
import { lineDiffsFromUnified } from "./parse-line-diff";

export function attachLineDiff(
  partial: Omit<GraphDiffOverlay, "unifiedDiff" | "lineDiffByPath" | "afterSourceByPath">,
  unifiedDiff: string | null,
): GraphDiffOverlay {
  const lineDiffByPath = unifiedDiff ? lineDiffsFromUnified(unifiedDiff) : new Map();
  // Populated by the commit/working-tree builders; paste mode has no snapshot.
  return { ...partial, unifiedDiff, lineDiffByPath, afterSourceByPath: new Map() };
}
