// @Architecture(descriptionShort="Pure splitting of a rendered token's text at wiki-link boundaries")
import type { WikiLinkSpan } from "./wiki-link-parser";

/** A slice of a token's text, carrying the link it belongs to (if any). */
export interface LinkSegment {
  text: string;
  startCol: number;
  link?: WikiLinkSpan;
}

/**
 * Split one token's text at link boundaries. `tokenStart` is the token's
 * 0-based column within its line; `links` are that line's spans, sorted and
 * non-overlapping. Mirrors `segmentTokenText` so a link span and a find-match
 * span can nest instead of fighting over the same text node.
 */
export function segmentByLinks(
  text: string,
  tokenStart: number,
  links: readonly WikiLinkSpan[],
): LinkSegment[] {
  const tokenEnd = tokenStart + text.length;
  const segments: LinkSegment[] = [];
  let cursor = tokenStart;
  for (const link of links) {
    if (link.endCol <= cursor || link.startCol >= tokenEnd) continue;
    const from = Math.max(link.startCol, cursor);
    const to = Math.min(link.endCol, tokenEnd);
    if (from > cursor) {
      segments.push({ text: text.slice(cursor - tokenStart, from - tokenStart), startCol: cursor });
    }
    segments.push({
      text: text.slice(from - tokenStart, to - tokenStart),
      startCol: from,
      link,
    });
    cursor = to;
  }
  if (cursor < tokenEnd) {
    segments.push({ text: text.slice(cursor - tokenStart), startCol: cursor });
  }
  return segments.length > 0 ? segments : [{ text, startCol: tokenStart }];
}
