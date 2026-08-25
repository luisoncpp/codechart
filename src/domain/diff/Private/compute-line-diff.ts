// @Architecture(descriptionShort="Computes line-level add/remove diffs between two source texts")
import type { FileLineDiff } from "./line-diff-types";

interface DiffEdit {
  kind: "equal" | "add" | "remove";
  text: string;
}

interface BacktrackCtx {
  trace: Int32Array[];
  maxD: number;
  max: number;
}

/** Compute a FileLineDiff comparing oldSource against newSource using Myers diff. */
export function computeLineDiff(oldSource: string, newSource: string): FileLineDiff {
  if (oldSource === newSource) return emptyDiff();
  const a = oldSource.length === 0 ? [] : oldSource.split(/\r?\n/);
  const b = newSource.length === 0 ? [] : newSource.split(/\r?\n/);
  if (a.length === 0) return allAdded(b);
  if (b.length === 0) return allRemoved(a);
  return editsToFileLineDiff(myersDiff(a, b));
}

function emptyDiff(): FileLineDiff {
  return {
    addedLineNumbers: new Set(),
    removedLineNumbers: new Set(),
    removeBeforeLine: new Map(),
  };
}

function allAdded(lines: readonly string[]): FileLineDiff {
  const added = new Set<number>();
  const addedTexts = new Map<number, string>();
  for (let i = 1; i <= lines.length; i++) {
    added.add(i);
    addedTexts.set(i, lines[i - 1]!);
  }
  return {
    addedLineNumbers: added,
    addedLineTexts: addedTexts,
    removedLineNumbers: new Set(),
    removedLineDetails: [],
    removeBeforeLine: new Map(),
  };
}

function allRemoved(lines: readonly string[]): FileLineDiff {
  const removed = new Set<number>();
  const removedDetails: Array<{ oldLine: number; text: string }> = [];
  for (let i = 1; i <= lines.length; i++) {
    removed.add(i);
    removedDetails.push({ oldLine: i, text: lines[i - 1]! });
  }
  return {
    addedLineNumbers: new Set(),
    addedLineTexts: new Map(),
    removedLineNumbers: removed,
    removedLineDetails: removedDetails,
    removeBeforeLine: new Map([[1, [...lines]]]),
  };
}

function myersDiff(a: readonly string[], b: readonly string[]): DiffEdit[] {
  const max = a.length + b.length;
  const trace: Int32Array[] = [];

  for (let d = 0; d <= max; d++) {
    const v = new Int32Array(2 * max + 1);
    const prevV = d > 0 ? trace[d - 1]! : null;
    for (let k = -d; k <= d; k += 2) {
      const kIdx = k + max;
      const x = snakeEnd(a, b, nextX(d, k, kIdx, prevV), k);
      v[kIdx] = x;
      if (x >= a.length && (x - k) >= b.length) {
        trace.push(v);
        return backtrack(a, b, { trace, maxD: d, max });
      }
    }
    trace.push(v);
  }
  return [];
}

function nextX(d: number, k: number, kIdx: number, prevV: Int32Array | null): number {
  if (d === 0 || !prevV) return 0;
  if (k === -d || (k !== d && prevV[kIdx - 1]! < prevV[kIdx + 1]!)) {
    return prevV[kIdx + 1]!;
  }
  return prevV[kIdx - 1]! + 1;
}

function snakeEnd(a: readonly string[], b: readonly string[], startX: number, k: number): number {
  let x = startX;
  let y = x - k;
  while (x < a.length && y < b.length && a[x] === b[y]) {
    x++;
    y++;
  }
  return x;
}

function backtrack(a: readonly string[], b: readonly string[], ctx: BacktrackCtx): DiffEdit[] {
  let x = a.length;
  let y = b.length;
  const edits: DiffEdit[] = [];

  for (let d = ctx.maxD; d > 0; d--) {
    const prevV = ctx.trace[d - 1]!;
    const prevK = prevKFor(x - y, d, prevV, ctx.max);
    const prevX = prevV[prevK + ctx.max]!;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ kind: "equal", text: a[--x]! });
      y--;
    }
    if (x === prevX) {
      edits.push({ kind: "add", text: b[--y]! });
    } else {
      edits.push({ kind: "remove", text: a[--x]! });
    }
  }

  while (x > 0 && y > 0) {
    edits.push({ kind: "equal", text: a[--x]! });
    y--;
  }
  return edits.reverse();
}

function prevKFor(k: number, d: number, prevV: Int32Array, max: number): number {
  const kIdx = k + max;
  return k === -d || (k !== d && prevV[kIdx - 1]! < prevV[kIdx + 1]!)
    ? k + 1
    : k - 1;
}

function editsToFileLineDiff(edits: readonly DiffEdit[]): FileLineDiff {
  const added = new Set<number>();
  const addedTexts = new Map<number, string>();
  const removed = new Set<number>();
  const removedDetails: Array<{ oldLine: number; text: string }> = [];
  const removeBefore = new Map<number, string[]>();
  let oldLine = 1;
  let newLine = 1;

  for (const edit of edits) {
    if (edit.kind === "equal") {
      oldLine++;
      newLine++;
      continue;
    }
    if (edit.kind === "remove") {
      removed.add(oldLine);
      removedDetails.push({ oldLine, text: edit.text });
      const list = removeBefore.get(newLine) ?? [];
      list.push(edit.text);
      removeBefore.set(newLine, list);
      oldLine++;
      continue;
    }
    added.add(newLine);
    addedTexts.set(newLine, edit.text);
    newLine++;
  }

  return {
    addedLineNumbers: added,
    addedLineTexts: addedTexts,
    removedLineNumbers: removed,
    removedLineDetails: removedDetails,
    removeBeforeLine: removeBefore,
  };
}
