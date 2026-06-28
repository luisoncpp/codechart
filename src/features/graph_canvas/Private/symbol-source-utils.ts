/** Locate the 0-indexed line number where a symbol is defined. */
export function findSymbolLine(source: string, symbolName: string): number {
  const lines = source.split("\n");
  if (symbolName === "default") {
    const idx = lines.findIndex((l) => /\bexport\s+default\b/.test(l));
    return idx !== -1 ? idx : 0;
  }
  const escaped = escapeRegExp(symbolName);
  const defRegex = new RegExp(
    `\\b(class|function|const|let|var|interface|type|enum|namespace|struct)\\s+${escaped}\\b`,
  );
  let idx = lines.findIndex((l) => defRegex.test(l));
  if (idx !== -1) return idx;

  const assignRegex = new RegExp(`\\b${escaped}\\s*[:=]`);
  idx = lines.findIndex((l) => assignRegex.test(l));
  if (idx !== -1) return idx;

  const wordRegex = new RegExp(`\\b${escaped}\\b`);
  idx = lines.findIndex((l) => wordRegex.test(l));
  if (idx !== -1) return idx;

  return 0;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

