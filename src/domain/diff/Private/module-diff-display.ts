import type { DiffDisplayRow, FileLineDiff } from "./line-diff-types";

/** Merge live source with a parsed file diff into renderable rows. */
export function buildModuleDiffDisplay(
  source: string,
  fileDiff: FileLineDiff | undefined,
): DiffDisplayRow[] {
  if (!fileDiff) return contextRows(source);
  const lines = source.split("\n");
  const rows: DiffDisplayRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    for (const removed of fileDiff.removeBeforeLine.get(lineNumber) ?? []) {
      rows.push({ kind: "remove", text: removed });
    }
    const text = lines[i] ?? "";
    const kind = fileDiff.addedLineNumbers.has(lineNumber) ? "add" : "context";
    rows.push({ kind, lineNumber, text });
  }

  for (const [lineNumber, removedLines] of fileDiff.removeBeforeLine) {
    if (lineNumber <= lines.length) continue;
    for (const removed of removedLines) {
      rows.push({ kind: "remove", text: removed });
    }
  }

  return rows;
}

function contextRows(source: string): DiffDisplayRow[] {
  return source.split("\n").map((text, i) => ({
    kind: "context" as const,
    lineNumber: i + 1,
    text,
  }));
}
