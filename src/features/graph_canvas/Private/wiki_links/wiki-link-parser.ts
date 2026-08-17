// @Architecture(descriptionShort="Pure scan for `[[target|label]]` spans in one line of text")

/** One `[[…]]` link found in a line (0-based, half-open columns). */
export interface WikiLinkSpan {
  startCol: number;
  endCol: number;
  /** The raw link destination as written, before path resolution. */
  target: string;
  /** What the reader sees — the `|label` part when present, else the target. */
  label: string;
}

/**
 * Bounded and linear on purpose: the character classes exclude the delimiters
 * and there is no repeated clause group, so this cannot backtrack
 * exponentially the way the old import regex did (see
 * `docs/lessons-learned/one-regex-for-two-import-forms-is-a-redos.md`). It runs
 * once per rendered row, so a quadratic pattern would stall the whole canvas.
 */
const WIKI_LINK = /\[\[([^[\]|\n]{1,200})(?:\|([^[\]|\n]{0,200}))?\]\]/g;

/** The same syntax anchored at the start — for the markdown inline tokenizer. */
const WIKI_LINK_PREFIX = /^\[\[([^[\]|\n]{1,200})(?:\|([^[\]|\n]{0,200}))?\]\]/;

/** A link if the text starts with one, so callers keep one syntax definition. */
export function matchWikiLinkPrefix(
  text: string,
): { raw: string; target: string; label: string } | null {
  const match = WIKI_LINK_PREFIX.exec(text);
  const target = match?.[1]!.trim();
  if (!match || !target) return null;
  return { raw: match[0], target, label: match[2]?.trim() || target };
}

/** Every link in a line, in column order, non-overlapping. */
export function findWikiLinks(text: string): WikiLinkSpan[] {
  if (!text.includes("[[")) return [];
  const spans: WikiLinkSpan[] = [];
  WIKI_LINK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK.exec(text)) !== null) {
    const target = match[1]!.trim();
    if (!target) continue;
    const label = match[2]?.trim() || target;
    spans.push({
      startCol: match.index,
      endCol: match.index + match[0].length,
      target,
      label,
    });
  }
  return spans;
}
