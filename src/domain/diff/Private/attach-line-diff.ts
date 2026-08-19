// @Architecture(descriptionShort="Attaches parsed line-level diff data to a graph overlay")
import type { GraphDiffOverlay } from "./types";
import { lineDiffsFromUnified } from "./parse-line-diff";

export function attachLineDiff(
  partial: Omit<
    GraphDiffOverlay,
    "unifiedDiff" | "lineDiffByPath" | "afterSourceByPath" | "beforeSourceByPath"
  >,
  unifiedDiff: string | null,
): GraphDiffOverlay {
  const lineDiffByPath = unifiedDiff ? lineDiffsFromUnified(unifiedDiff) : new Map();
  // After-sources are filled by commit/working-tree builders; paste has none.
  // Deleted before-sources are filled by `attachDeletedBeforeSources`.
  return {
    ...partial,
    unifiedDiff,
    lineDiffByPath,
    afterSourceByPath: new Map(),
    beforeSourceByPath: new Map(),
  };
}
