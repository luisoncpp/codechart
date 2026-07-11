// @Architecture(descriptionShort="Attaches source-range-aware symbol states to a diff overlay")
import type { GraphDiffOverlay } from "./types";
import { classifySymbolChanges, type SymbolDiffInput } from "./symbol-diff";

export function attachSymbolDiff(
  overlay: GraphDiffOverlay,
  input: SymbolDiffInput,
): GraphDiffOverlay {
  return { ...overlay, ...classifySymbolChanges(input) };
}
