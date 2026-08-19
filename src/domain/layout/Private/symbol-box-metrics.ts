// @Architecture(descriptionShort="Calculates layout metrics and sizing for symbol nodes")
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

/** Minimum on-screen px for a world-sized symbol label to be readable. */
const SYMBOL_FONT_SCREEN_MIN = 12;
/** Minimum on-screen px for the card's shorter side before painting the grid. */
const SYMBOL_CARD_MIN_SIDE_SCREEN = 140;

/** Whether L1.5 symbol boxes should paint at this camera zoom and card size. */
export function symbolsFitOnScreen(
  worldWidth: number,
  worldHeight: number,
  zoom: number,
): boolean {
  if (!Number.isFinite(zoom) || zoom <= 0) return false;
  if (SYMBOL_BOX.fontSize * zoom < SYMBOL_FONT_SCREEN_MIN) return false;
  if (Math.min(worldWidth, worldHeight) * zoom < SYMBOL_CARD_MIN_SIDE_SCREEN) return false;
  return true;
}
