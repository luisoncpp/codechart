// @Architecture(descriptionShort="Merges live source with parsed file diff into display rows")
import type { DiffDisplayRow, FileLineDiff } from "./line-diff-types";

/** Merge live source with a parsed file diff into renderable rows. */
export function buildModuleDiffDisplay(
  source: string,
  fileDiff: FileLineDiff | undefined,
): DiffDisplayRow[] {
  if (!fileDiff) return contextRows(source);
  const lines = afterLines(source);
  const rows: DiffDisplayRow[] = [];
  let oldLineNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    for (const removed of fileDiff.removeBeforeLine.get(lineNumber) ?? []) {
      rows.push({ kind: "remove", lineNumber: oldLineNumber++, text: removed });
    }
    const text = lines[i] ?? "";
    const isAdd = fileDiff.addedLineNumbers.has(lineNumber);
    rows.push({ kind: isAdd ? "add" : "context", lineNumber, text });
    if (!isAdd) oldLineNumber++;
  }

  for (const [lineNumber, removedLines] of fileDiff.removeBeforeLine) {
    if (isAfterLine(lineNumber, lines.length)) continue;
    for (const removed of removedLines) {
      rows.push({ kind: "remove", lineNumber: oldLineNumber++, text: removed });
    }
  }

  return rows;
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
