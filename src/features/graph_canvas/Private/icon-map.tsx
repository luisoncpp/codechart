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
};

export function iconGlyph(name: string | undefined): string | null {
  if (!name) return null;
  return ICONS[name] ?? null;
}
