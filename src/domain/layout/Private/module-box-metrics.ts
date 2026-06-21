import { SYMBOL_BOX, symbolBoxWidth } from "./symbol-box-metrics";

/** Typography + box sizing shared by ELK layout and `ModuleNodeView`.
 *
 *  Every module box is sized to fit its content (the wrapped filename, plus the
 *  packed exported-symbol boxes at L1.5+) and then clamped to a screen-like
 *  aspect window: never **wider** than 4:3, never **taller** than 4:5. The box
 *  is a fixed viewport — richer zoomed-in content (symbols, source, MD) lives
 *  inside and scrolls — so a predictable, well-proportioned footprint matters
 *  more than hugging the content. Boxes never shrink below the base. */
export const MODULE_BOX = {
  /** L1 (non-detail) label size; the largest the label is ever drawn. */
  fontSize: 11,
  /** Monospace glyph advance at `fontSize` (generous so labels rarely clip). */
  charWidth: 6.7,
  /** Horizontal padding around the centered label (`0 8px` both sides). */
  hPadding: 16,
  lineHeight: 14,
  vPadding: 12,
  /** Base footprint — boxes never go below this (it sits at the 4:3 edge). */
  minWidth: 120,
  minHeight: 90,
  /** Aspect window (width / height). 4:3 widest, 4:5 tallest. */
  maxAspect: 4 / 3,
  minAspect: 4 / 5,
} as const;

/** Inner symbol-packing metrics (must mirror MODULE_COMPOUND_OPTIONS padding). */
const SYMBOL_GRID = {
  gap: 4,
  /** top = moduleHeaderHeight + moduleSymbolPadding; sides/bottom = moduleSymbolPadding. */
  padTop: 26,
  padOther: 6,
  /** Target aspect ELK packs symbols toward (kept inside the box's window). */
  aspect: 1.2,
  /** Slack over the ideal packed area so the box holds ELK's real (looser) packing. */
  slack: 1.3,
} as const;

/** Footprint that fits `label` + `symbols`, clamped to the aspect window and
 *  floored at the base. Sized from the symbols' *area* (not a worst-case grid),
 *  so a symbol-heavy module stays compact instead of ballooning. */
export function moduleBoxSize(
  label: string,
  symbols: readonly string[] = [],
): { width: number; height: number } {
  const labelH = wrappedLabelHeight(label);
  const content = symbolContentSize(symbols);
  const width = Math.max(MODULE_BOX.minWidth, content.width);
  const height = Math.max(MODULE_BOX.minHeight, labelH, content.height);
  return clampToAspect(width, height);
}

/** Height needed for the filename wrapped at the base width. */
function wrappedLabelHeight(label: string): number {
  const textWidth = label.length * MODULE_BOX.charWidth;
  const lines = Math.max(1, Math.ceil(textWidth / (MODULE_BOX.minWidth - MODULE_BOX.hPadding)));
  return lines * MODULE_BOX.lineHeight + MODULE_BOX.vPadding;
}

/** Compact bounding box for the packed symbols: from total area at the target
 *  aspect, floored so the widest single symbol still fits on one row. */
function symbolContentSize(symbols: readonly string[]): { width: number; height: number } {
  if (symbols.length === 0) return { width: 0, height: 0 };
  const cellH = SYMBOL_BOX.height + SYMBOL_GRID.gap;
  const area = symbols.reduce((sum, s) => sum + (symbolBoxWidth(s) + SYMBOL_GRID.gap) * cellH, 0);
  const packed = area * SYMBOL_GRID.slack;
  const innerW = Math.max(Math.sqrt(packed * SYMBOL_GRID.aspect), Math.max(...symbols.map(symbolBoxWidth)));
  const innerH = packed / innerW;
  return {
    width: Math.ceil(innerW) + 2 * SYMBOL_GRID.padOther,
    height: Math.ceil(innerH) + SYMBOL_GRID.padTop + SYMBOL_GRID.padOther,
  };
}

/** Grow the deficient dimension so width / height lands in the aspect window. */
function clampToAspect(width: number, height: number): { width: number; height: number } {
  if (width / height > MODULE_BOX.maxAspect) height = width / MODULE_BOX.maxAspect; // too wide → taller
  if (width / height < MODULE_BOX.minAspect) width = height * MODULE_BOX.minAspect; // too tall → wider
  return { width: Math.ceil(width), height: Math.ceil(height) };
}
