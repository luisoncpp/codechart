// @Architecture(descriptionShort="Re-anchors a pasted diff overlay onto live files: after-sources + remapped line coordinates")
import type { DiffNote, GraphDiffOverlay } from "./types";
import type { FileLineDiff } from "./line-diff-types";
import { pasteHunksByPath } from "./paste-hunks";
import { anchorPasteHunks, type AnchoredPasteFile } from "./paste-after-sources";
import { detectMovedLines } from "./detect-moved-lines";

type LineMap = ReadonlyMap<number, number>;

/**
 * Paste mode has no snapshot, so its header line numbers need not match any file on disk.
 * For every live file where the hunks can be located, render the rebuilt after-text and
 * move every after-side coordinate (added rows, removal anchors, after-side Diff Notes) to
 * where its hunk actually landed. Rows of a hunk found nowhere are dropped, not misplaced.
 */
export function anchorPasteDiff(
  overlay: GraphDiffOverlay,
  liveByPath: ReadonlyMap<string, string>,
): GraphDiffOverlay {
  if (!overlay.unifiedDiff) return overlay;
  const anchored = new Map<string, AnchoredPasteFile>();
  for (const [path, hunks] of pasteHunksByPath(overlay.unifiedDiff)) {
    const live = liveByPath.get(path);
    const file = live === undefined ? null : anchorPasteHunks(live, hunks);
    if (file) anchored.set(path, file);
  }
  if (anchored.size === 0) return overlay;
  const afterSourceByPath = new Map(overlay.afterSourceByPath);
  const lineDiffs = new Map<string, FileLineDiff>();
  for (const [path, diff] of overlay.lineDiffByPath) {
    const lineMap = anchored.get(path)?.lineMap;
    lineDiffs.set(path, lineMap ? remapFileLineDiff(diff, lineMap) : withoutMoves(diff));
  }
  for (const [path, file] of anchored) afterSourceByPath.set(path, file.source);
  return {
    ...overlay,
    afterSourceByPath,
    lineDiffByPath: detectMovedLines(lineDiffs),
    diffNotes: overlay.diffNotes.map(/*toAnchoredLines*/ (note) => remapNote(note, anchored)),
  };
}

/** Moves are cross-file line references, so they are recomputed after every file moved. */
function withoutMoves(diff: FileLineDiff): FileLineDiff {
  return { ...diff, movedAddedLines: undefined, movedRemovedLines: undefined };
}

function remapFileLineDiff(diff: FileLineDiff, lineMap: LineMap): FileLineDiff {
  const added = new Set<number>();
  const addedTexts = new Map<number, string>();
  for (const line of diff.addedLineNumbers) {
    const target = lineMap.get(line);
    if (target === undefined) continue;
    added.add(target);
    const text = diff.addedLineTexts?.get(line);
    if (text !== undefined) addedTexts.set(target, text);
  }
  return { ...withoutMoves(diff), addedLineNumbers: added, addedLineTexts: addedTexts, ...remapRemovals(diff, lineMap) };
}

/** `removedLineDetails` is consumed in bucket order, so it must drop exactly the dropped buckets. */
function remapRemovals(diff: FileLineDiff, lineMap: LineMap) {
  const removeBeforeLine = new Map<number, readonly string[]>();
  const details = diff.removedLineDetails ?? [];
  const keptDetails: Array<{ oldLine: number; text: string }> = [];
  let index = 0;
  for (const [line, rows] of diff.removeBeforeLine) {
    const target = lineMap.get(line);
    const bucketDetails = details.slice(index, index + rows.length);
    index += rows.length;
    if (target === undefined) continue;
    removeBeforeLine.set(target, [...(removeBeforeLine.get(target) ?? []), ...rows]);
    keptDetails.push(...bucketDetails);
  }
  return { removeBeforeLine, removedLineDetails: keptDetails };
}

function remapNote(note: DiffNote, anchored: ReadonlyMap<string, AnchoredPasteFile>): DiffNote {
  const lineMap = anchored.get(note.path)?.lineMap;
  if (!lineMap || note.side !== "after") return note;
  const startLine = lineMap.get(note.startLine);
  const endLine = lineMap.get(note.endLine);
  if (startLine === undefined || endLine === undefined) return note;
  return { ...note, startLine, endLine };
}
