// @Architecture(descriptionShort="Renders one syntax token's text with nested wiki-link and find-match spans")
import { segmentTokenText, type LineMatchRange } from "./match-highlight";
import { segmentByLinks, type WikiLinkSpan } from "../wiki_links";

interface TokenTextProps {
  text: string;
  /** The token's 0-based column within its line. */
  tokenStart: number;
  /** Written onto each link span so a click knows which file it came from. */
  path: string;
  /** This line's link spans, or none when the token cannot hold links. */
  links?: readonly WikiLinkSpan[];
  matchRanges?: readonly LineMatchRange[];
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

interface MatchOptions {
  matchRanges?: readonly LineMatchRange[];
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Link spans wrap match spans, and both stay **nested inside** the token span
 * so `hl-clickable` navigation still reads a whole identifier from
 * `textContent`. Destinations: [[docs/architecture/wiki-links.md#Opening a destination]].
 */
export function TokenText({ text, tokenStart, path, links, matchRanges, activeMatchRef }: TokenTextProps) {
  const options = { matchRanges, activeMatchRef };
  const segments = segmentByLinks(text, tokenStart, links ?? []);
  if (segments.length === 1 && !segments[0]!.link) {
    return <>{renderMatches(text, tokenStart, options)}</>;
  }
  return (
    <>
      {segments.map((segment, i) =>
        segment.link ? (
          <span
            key={i}
            className="hl-wiki-link"
            data-wiki-target={segment.link.target}
            data-wiki-from={path}
          >
            {renderMatches(segment.text, segment.startCol, options)}
          </span>
        ) : (
          <span key={i}>{renderMatches(segment.text, segment.startCol, options)}</span>
        ),
      )}
    </>
  );
}

/** Nested match spans keep the surrounding span's full textContent intact. */
function renderMatches(text: string, startCol: number, options: MatchOptions) {
  if (!options.matchRanges?.length) return text;
  const segments = segmentTokenText(text, startCol, options.matchRanges);
  if (segments.length === 1 && !segments[0]!.match) return text;
  return segments.map((segment, i) =>
    segment.match ? (
      <span
        key={i}
        ref={segment.match === "active" ? (options.activeMatchRef as React.Ref<HTMLSpanElement>) : undefined}
        className={`hl-match${segment.match === "active" ? " hl-match--active" : ""}`}
      >
        {segment.text}
      </span>
    ) : (
      segment.text
    ),
  );
}
