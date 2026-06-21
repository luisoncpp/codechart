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

/** Centered-label fit (L1 only): grow the font so a short name fills its box. */
export const LABEL_FIT = {
  /** Largest the centered label is ever drawn — keeps one box from shouting. */
  maxFont: 22,
  /** Monospace advance / fontSize (derived from the box's own metrics). */
  charRatio: MODULE_BOX.charWidth / MODULE_BOX.fontSize,
  /** Conservative line height (≥ the 1.15 the header renders) so it never overflows. */
  lineRatio: 1.3,
} as const;

/** Largest font (px) at which `label` fits a centered, wrap-anywhere block inside
 *  a `width`×`height` box. A short filename in a base-or-larger box gets drawn big
 *  instead of floating tiny at the 11px floor; floored at the base so it never
 *  regresses, capped at `maxFont` so it never dominates. */
export function fitLabelFontSize(label: string, width: number, height: number): number {
  const innerW = width - MODULE_BOX.hPadding;
  const innerH = height - MODULE_BOX.vPadding;
  const len = Math.max(1, label.length);
  for (let font = LABEL_FIT.maxFont; font > MODULE_BOX.fontSize; font--) {
    const charsPerLine = Math.floor(innerW / (font * LABEL_FIT.charRatio));
    if (charsPerLine < 1) continue;
    const lines = Math.ceil(len / charsPerLine);
    if (lines * font * LABEL_FIT.lineRatio <= innerH) return font;
  }
  return MODULE_BOX.fontSize;
}

/** Typography + footprint for a group's in-body description box (sized like a
 *  module box, but from prose length instead of a symbol grid). World units.
 *  Two fonts: the L1 short blurb reads large (like the filenames); the denser
 *  L1.5 long prose stays smaller so the box doesn't balloon. The box is packed
 *  to fit *both* (`descriptionBoxSize`), so neither variant truncates. */
export const DESC_BOX = {
  /** L1.5 long prose + box sizing — kept modest so annotated groups stay compact. */
  fontSize: 16,
  /** L1 short blurb — matches the module label's max (`LABEL_FIT.maxFont`) so it
   *  reads at the same scale as the filenames, not like fine print. */
  l1FontSize: 22,
  /** Sans-serif glyph advance / line height as ratios of the font in use. */
  charRatio: 0.52,
  lineRatio: 1.33,
  padding: 12,
  /** Never narrower/shorter than a comfortable module-box footprint. */
  minWidth: 180,
  minHeight: MODULE_BOX.minHeight,
  /** Cap the width so long prose wraps into a box-like shape, not a wide banner. */
  maxWidth: 340,
} as const;

/** Footprint that fits the long prose (at `fontSize`) **and** the short blurb (at
 *  the larger `l1FontSize`), so neither L1 nor L1.5 truncates. Width capped so prose
 *  wraps into a module-box-like shape; floored at the base. */
export function descriptionBoxSize(
  shortText: string,
  longText: string,
): { width: number; height: number } {
  const long = boxFor(longText, DESC_BOX.fontSize);
  const short = boxFor(shortText, DESC_BOX.l1FontSize);
  return { width: Math.max(long.width, short.width), height: Math.max(long.height, short.height) };
}

function boxFor(text: string, font: number): { width: number; height: number } {
  const charWidth = font * DESC_BOX.charRatio;
  const lineHeight = font * DESC_BOX.lineRatio;
  const contentW = text.length * charWidth + 2 * DESC_BOX.padding;
  const width = Math.max(DESC_BOX.minWidth, Math.min(DESC_BOX.maxWidth, Math.ceil(contentW)));
  const charsPerLine = Math.max(1, Math.floor((width - 2 * DESC_BOX.padding) / charWidth));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  const height = Math.max(DESC_BOX.minHeight, Math.ceil(lines * lineHeight + 2 * DESC_BOX.padding));
  return { width, height };
}

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
