// @Architecture(descriptionShort="Unified display rows → after-only rows or split (before | after) row pairs")
import type { DiffDisplayRow } from "./line-diff-types";

/** How a diffed file is shown: interleaved, two columns, or the after-file only. */
export type DiffViewMode = "unified" | "split" | "after";

/** One side of a split row; `index` points back into the unified rows (shared tokens). */
export interface SplitCell {
  index: number;
  row: DiffDisplayRow;
}

/** One visual line of the split view; a missing side renders as filler. */
export interface SplitRow {
  left?: SplitCell;
  right?: SplitCell;
}

const isRemoved = (row: DiffDisplayRow) => row.kind === "remove" || row.kind === "move-remove";

/** The after-file only: deleted and moved-away rows are dropped without a trace. */
export function afterOnlyRows(rows: readonly DiffDisplayRow[]): DiffDisplayRow[] {
  return rows.filter((row) => !isRemoved(row));
}

/**
 * Pair unified rows into before | after columns. Context rows sit on both sides
 * (the left copy renumbered to its old-file line); each run of changed rows zips
 * its removals with its additions, padding the shorter side with filler.
 */
export function pairSplitRows(rows: readonly DiffDisplayRow[]): SplitRow[] {
  const pairs: SplitRow[] = [];
  let oldLine = 1;
  let i = 0;
  while (i < rows.length) {
    const row = rows[i]!;
    if (row.kind === "context") {
      pairs.push({ left: { index: i, row: { ...row, lineNumber: oldLine++ } }, right: { index: i, row } });
      i++;
      continue;
    }
    const run = collectChangeRun(rows, i);
    const last = run.removed[run.removed.length - 1];
    if (last) oldLine = last.row.lineNumber + 1;
    zipRun(pairs, run);
    i = run.end;
  }
  return pairs;
}

interface ChangeRun {
  removed: SplitCell[];
  added: SplitCell[];
  /** Index of the first row after the run. */
  end: number;
}

function collectChangeRun(rows: readonly DiffDisplayRow[], start: number): ChangeRun {
  const run: ChangeRun = { removed: [], added: [], end: start };
  while (run.end < rows.length && rows[run.end]!.kind !== "context") {
    const row = rows[run.end]!;
    (isRemoved(row) ? run.removed : run.added).push({ index: run.end, row });
    run.end++;
  }
  return run;
}

function zipRun(pairs: SplitRow[], run: ChangeRun): void {
  const length = Math.max(run.removed.length, run.added.length);
  for (let k = 0; k < length; k++) pairs.push({ left: run.removed[k], right: run.added[k] });
}
