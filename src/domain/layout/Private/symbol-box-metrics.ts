/** Typography + padding shared by ELK layout and `SymbolNodeView`. */
export const SYMBOL_BOX = {
  fontSize: 9,
  /** Monospace average glyph width at `fontSize` (generous so labels rarely clip). */
  charWidth: 5.7,
  hPadding: 10,
  /** Kind badge column — must match `.symbol-box__badge` in graph-canvas.css. */
  kindBadgeWidth: 13,
  minWidth: 84,
  maxWidth: 200,
  height: 20,
} as const;

/** ELK leaf width for one exported symbol — grows with the label, capped. */
export function symbolBoxWidth(label: string): number {
  const text = Math.ceil(label.length * SYMBOL_BOX.charWidth);
  const withPad = text + SYMBOL_BOX.hPadding + SYMBOL_BOX.kindBadgeWidth;
  return Math.min(SYMBOL_BOX.maxWidth, Math.max(SYMBOL_BOX.minWidth, withPad));
}
