// @Architecture(descriptionShort="Splits unified diff text into lines with real ---/+++ file headers marked")

export type DiffHeaderSide = "old" | "new";

export interface DiffLine {
  text: string;
  /** Set only on a real file header; a `-- x` / `++ x` content line stays null. */
  header: DiffHeaderSide | null;
}

/**
 * Split unified diff text and mark which `---` / `+++` lines are file headers.
 *
 * The prefix alone cannot decide: a removed line whose content starts with `-- ` (SQL,
 * Lua) serializes as `--- ...`, and an added `++ x` as `+++ x`. A header is always the
 * **pair** `--- X` immediately followed by `+++ Y`, so that lookahead is the only
 * reliable test — `diff --git` is a hint, not a delimiter, and a bare diff has nothing
 * else to key on. Every parser over diff text must share this one rule; see
 * `lessons-learned/four-parsers-read-the-same-diff-text.md`.
 */
export function scanDiffLines(text: string): DiffLine[] {
  const lines = text.split(/\r?\n/);
  return lines.map((line, index) => ({ text: line, header: headerSideAt(lines, index) }));
}

function headerSideAt(lines: readonly string[], index: number): DiffHeaderSide | null {
  const line = lines[index] ?? "";
  if (line.startsWith("--- ")) {
    return lines[index + 1]?.startsWith("+++ ") ? "old" : null;
  }
  if (!line.startsWith("+++ ")) return null;
  return lines[index - 1]?.startsWith("--- ") ? "new" : null;
}
