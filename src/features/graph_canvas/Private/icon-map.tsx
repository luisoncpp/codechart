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
