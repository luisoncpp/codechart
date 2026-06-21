import type { SymbolKind } from "../../../domain/graph";

/** IDE-style glyph + human label for each inferred symbol kind. */
export const SYMBOL_KIND_DISPLAY: Record<
  SymbolKind,
  { glyph: string; label: string }
> = {
  component: { glyph: "◇", label: "Component" },
  interface: { glyph: "I", label: "Interface" },
  type: { glyph: "T", label: "Type" },
  class: { glyph: "C", label: "Class" },
  hook: { glyph: "⚡", label: "Hook" },
  predicate: { glyph: "?", label: "Predicate" },
  function: { glyph: "ƒ", label: "Function" },
  constant: { glyph: "#", label: "Constant" },
  default: { glyph: "↵", label: "Default export" },
};
