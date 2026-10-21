// @Architecture(descriptionShort="Pure change-block math for next/previous diff change navigation in a preview frame")
import type { FileLineDiff } from "../../../../domain/diff";

const CHANGED_KINDS = new Set(["add", "remove", "move-add", "move-remove"]);

/** Midpoints closer than this to the view center count as "at" the center. */
const CENTER_SLACK_PX = 2;

/** Whether the file diff would render any `+` / `-` row. */
export function hasLineChanges(fileDiff: FileLineDiff | undefined): boolean {
  if (!fileDiff) return false;
  return fileDiff.addedLineNumbers.size > 0 || fileDiff.removeBeforeLine.size > 0;
}

/** Row index of the first row of each run of consecutive changed rows. */
export function changeBlockStarts(kinds: readonly string[]): number[] {
  const starts: number[] = [];
  kinds.forEach((kind, i) => {
    if (!CHANGED_KINDS.has(kind)) return;
    if (i > 0 && CHANGED_KINDS.has(kinds[i - 1]!)) return;
    starts.push(i);
  });
  return starts;
}

export interface ChangeBlockPick {
  /** Vertical midpoint of each block's first row, in the same space as `viewCenter`. */
  mids: readonly number[];
  viewCenter: number;
  delta: 1 | -1;
  /**
   * Block the previous step landed on, while the body has not scrolled since.
   * A block near the file's top or bottom cannot be centered, so position alone
   * would pick it again forever; stepping from the index keeps going.
   */
  current: number | null;
}

/** Index of the block to center next (wrapping), or -1 when there are none. */
export function pickChangeBlock({ mids, viewCenter, delta, current }: ChangeBlockPick): number {
  const count = mids.length;
  if (count === 0) return -1;
  if (current !== null) return (current + delta + count) % count;
  if (delta === 1) {
    const next = mids.findIndex((mid) => mid > viewCenter + CENTER_SLACK_PX);
    return next === -1 ? 0 : next;
  }
  for (let i = count - 1; i >= 0; i--) {
    if (mids[i]! < viewCenter - CENTER_SLACK_PX) return i;
  }
  return count - 1;
}
