// @Architecture(descriptionShort="Merges live source with parsed file diff into display rows")
import type { DiffDisplayRow, FileLineDiff, MovedLocation } from "./line-diff-types";

/** Merge live source with a parsed file diff into renderable rows. */
export function buildModuleDiffDisplay(
  source: string,
  fileDiff: FileLineDiff | undefined,
): DiffDisplayRow[] {
  if (!fileDiff) return contextRows(source);
  const lines = afterLines(source);
  const state: RowState = { fileDiff, rows: [], misaligned: [], oldLineNumber: 1, removedIdx: 0 };
  lines.forEach(/*pushRemovalsThenLine*/ (text, i) => {
    pushRemoved(state, fileDiff.removeBeforeLine.get(i + 1) ?? []);
    pushLine(state, i + 1, text);
  });
  warnMisaligned(state.misaligned);
  for (const [lineNumber, removedLines] of fileDiff.removeBeforeLine) {
    if (!isAfterLine(lineNumber, lines.length)) pushRemoved(state, removedLines);
  }
  return state.rows;
}

interface RowState {
  fileDiff: FileLineDiff;
  rows: DiffDisplayRow[];
  misaligned: number[];
  oldLineNumber: number;
  removedIdx: number;
}

function pushRemoved(state: RowState, removedLines: readonly string[]): void {
  for (const removed of removedLines) {
    const oldLine = getRemovedLine(state.fileDiff, state.removedIdx++, state.oldLineNumber++);
    state.rows.push(createRemovedRow(oldLine, removed, state.fileDiff.movedRemovedLines));
  }
}

function pushLine(state: RowState, lineNumber: number, text: string): void {
  const { fileDiff } = state;
  const claimsAdd = fileDiff.addedLineNumbers.has(lineNumber);
  const isAdd = claimsAdd && addedTextMatches(fileDiff, lineNumber, text);
  if (claimsAdd && !isAdd) state.misaligned.push(lineNumber);
  if (isAdd) {
    state.rows.push(createAddedRow(lineNumber, text, fileDiff.movedAddedLines));
    return;
  }
  state.rows.push({ kind: "context", lineNumber, text });
  state.oldLineNumber++;
}

/**
 * The regression guard for every "diff paints the wrong lines" bug: an added row must carry
 * the text the diff added. Parser drift, a stale or unpatched live file, a bad remap — any
 * of them surfaces here as a mismatch, which renders as context instead of a false `+`.
 */
function addedTextMatches(fileDiff: FileLineDiff, lineNumber: number, text: string): boolean {
  const expected = fileDiff.addedLineTexts?.get(lineNumber);
  return expected === undefined || expected.trimEnd() === text.trimEnd();
}

function warnMisaligned(lineNumbers: readonly number[]): void {
  if (lineNumbers.length === 0) return;
  console.warn(
    `[diff] ${lineNumbers.length} added row(s) do not match the rendered source ` +
      `(first at line ${lineNumbers[0]}); shown as context. The diff coordinates and the ` +
      `rendered snapshot disagree — see lessons-learned/diff-line-highlights-index-after-snapshot.md.`,
  );
}

function getRemovedLine(fileDiff: FileLineDiff, idx: number, fallback: number): number {
  if (fileDiff.removedLineDetails && idx < fileDiff.removedLineDetails.length) {
    return fileDiff.removedLineDetails[idx]!.oldLine;
  }
  return fallback;
}

function createRemovedRow(
  oldLine: number,
  text: string,
  moved?: ReadonlyMap<number, MovedLocation>,
): DiffDisplayRow {
  const target = moved?.get(oldLine);
  if (target) {
    return {
      kind: "move-remove",
      lineNumber: oldLine,
      text,
      movedTo: target,
      tooltip: `Moved to ${target.path}:${target.line}`,
    };
  }
  return { kind: "remove", lineNumber: oldLine, text };
}

function createAddedRow(
  newLine: number,
  text: string,
  moved?: ReadonlyMap<number, MovedLocation>,
): DiffDisplayRow {
  const origin = moved?.get(newLine);
  if (origin) {
    return {
      kind: "move-add",
      lineNumber: newLine,
      text,
      movedFrom: origin,
      tooltip: `Moved from ${origin.path}:${origin.line}`,
    };
  }
  return { kind: "add", lineNumber: newLine, text };
}

/** `"".split("\n")` is `[""]`; a deleted after-file has no rows. */
function afterLines(source: string): string[] {
  return source.length === 0 ? [] : source.split("\n");
}

/** New-file line numbers are 1-based; hunk `+0,0` keys removals at 0. */
function isAfterLine(lineNumber: number, afterCount: number): boolean {
  return lineNumber >= 1 && lineNumber <= afterCount;
}

function contextRows(source: string): DiffDisplayRow[] {
  return source.split("\n").map((text, i) => ({
    kind: "context" as const,
    lineNumber: i + 1,
    text,
  }));
}
