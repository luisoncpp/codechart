// @Architecture(descriptionShort="Merges live source with parsed file diff into display rows")
import type { DiffDisplayRow, FileLineDiff, MovedLocation } from "./line-diff-types";

/** Merge live source with a parsed file diff into renderable rows. */
export function buildModuleDiffDisplay(
  source: string,
  fileDiff: FileLineDiff | undefined,
): DiffDisplayRow[] {
  if (!fileDiff) return contextRows(source);
  const lines = afterLines(source);
  const rows: DiffDisplayRow[] = [];
  let oldLineNumber = 1;
  let removedIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    for (const removed of fileDiff.removeBeforeLine.get(lineNumber) ?? []) {
      const oldLine = getRemovedLine(fileDiff, removedIdx++, oldLineNumber++);
      rows.push(createRemovedRow(oldLine, removed, fileDiff.movedRemovedLines));
    }
    const text = lines[i] ?? "";
    const isAdd = fileDiff.addedLineNumbers.has(lineNumber);
    rows.push(isAdd ? createAddedRow(lineNumber, text, fileDiff.movedAddedLines) : { kind: "context", lineNumber, text });
    if (!isAdd) oldLineNumber++;
  }

  for (const [lineNumber, removedLines] of fileDiff.removeBeforeLine) {
    if (isAfterLine(lineNumber, lines.length)) continue;
    for (const removed of removedLines) {
      const oldLine = getRemovedLine(fileDiff, removedIdx++, oldLineNumber++);
      rows.push(createRemovedRow(oldLine, removed, fileDiff.movedRemovedLines));
    }
  }

  return rows;
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
