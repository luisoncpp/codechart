// @Architecture(descriptionShort="Attaches parsed line-level diff data to a graph overlay")
import type { GraphDiffCore, GraphDiffOverlay } from "./types";
import { lineDiffsFromUnified } from "./parse-line-diff";
import { parseDiffNotes } from "./parse-diff-notes";

export function attachLineDiff(
  partial: GraphDiffCore,
  unifiedDiff: string | null,
): GraphDiffOverlay {
  const lineDiffByPath = unifiedDiff ? lineDiffsFromUnified(unifiedDiff) : new Map();
  const { notes: diffNotes, droppedMarkerText } = unifiedDiff
    ? parseDiffNotes(unifiedDiff)
    : { notes: [], droppedMarkerText: "" };
  // After-sources are filled by commit/working-tree builders; paste has none.
  // Deleted before-sources are filled by `attachDeletedBeforeSources`.
  return {
    ...partial,
    unifiedDiff,
    lineDiffByPath,
    afterSourceByPath: new Map(),
    beforeSourceByPath: new Map(),
    diffNotes,
    droppedMarkerText,
  };
}
