// @Architecture(descriptionShort="Pure splitting of rendered text at search-match boundaries")

/** One match's column span within a line (0-based, half-open). */
export interface LineMatchRange {
  startCol: number;
  endCol: number;
  active: boolean;
}

/** A slice of a token's text, optionally marked as (active) search match. */
export interface TextSegment {
  text: string;
  match?: "match" | "active";
}

/**
 * Split one token's text at match-range boundaries. `tokenStart` is the
 * token's 0-based column offset within its line. Ranges must be sorted and
 * non-overlapping; a range spanning several tokens marks a segment in each.
 */
export function segmentTokenText(
  text: string,
  tokenStart: number,
  ranges: readonly LineMatchRange[],
): TextSegment[] {
  const tokenEnd = tokenStart + text.length;
  const segments: TextSegment[] = [];
  let cursor = tokenStart;
  for (const range of ranges) {
    if (range.endCol <= cursor || range.startCol >= tokenEnd) continue;
    const from = Math.max(range.startCol, cursor);
    const to = Math.min(range.endCol, tokenEnd);
    if (from > cursor) {
      segments.push({ text: text.slice(cursor - tokenStart, from - tokenStart) });
    }
    segments.push({
      text: text.slice(from - tokenStart, to - tokenStart),
      match: range.active ? "active" : "match",
    });
    cursor = to;
  }
  if (cursor < tokenEnd) {
    segments.push({ text: text.slice(cursor - tokenStart) });
  }
  return segments.length > 0 ? segments : [{ text }];
}
