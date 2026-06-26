// @Architecture(descriptionShort="Maps icon name strings to SVG React components")
/** Sparing icon set: named annotation icons → a compact glyph. */
const ICONS: Record<string, string> = {
  cube: "📦",
  wrench: "🔧",
  gear: "⚙️",
  bolt: "⚡",
  hook: "🪝",
  database: "🗄️",
  layers: "🧱",
  panel: "🪟",
  dialog: "💬",
  sidebar: "📑",
  "app-window": "🖥️",
  plug: "🔌",
  share: "🔗",
  layout: "🧩",
  globe: "🌐",
};

export function iconGlyph(name: string | undefined): string | null {
  if (!name) return null;
  return ICONS[name] ?? null;
}

/** Emojis render visually smaller than Latin at the same fontSize. */
export const ICON_EMOJI_BOOST = 1.35;

/** Fixed layout slot for icons inside module boxes (world px). */
export const MODULE_ICON_LAYOUT = 16;

/** World-unit icon size for group headers (counter-scaled). */
export function iconFontSize(basePx: number, counterScale: number): number {
  return basePx * counterScale * ICON_EMOJI_BOOST;
}

/** Visual-only boost for module icons — transform scale, capped so the glyph
 *  does not outgrow its fixed layout slot and get clipped by overflow. */
export function moduleIconVisualScale(counterScale: number): number {
  return Math.min(counterScale * ICON_EMOJI_BOOST, 2.2);
}
