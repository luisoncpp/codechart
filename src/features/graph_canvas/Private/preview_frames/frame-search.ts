// @Architecture(descriptionShort="Pure find-in-frame matching over a frame's description and source text")
import type { ActiveMatch, LineMatchRange } from "../highlight/match-highlight";

/** One in-frame match. `line` is 1-based for code, always 0 for description. */
export interface FrameMatch {
  region: "description" | "code";
  line: number;
  startCol: number;
  endCol: number;
}

export interface FrameSearchInput {
  description?: string;
  sourceText: string;
  query: string;
}

/**
 * Case-insensitive, non-overlapping substring matches: description matches
 * first, then code matches in line/column order. Empty query yields none.
 */
export function findFrameMatches(input: FrameSearchInput): FrameMatch[] {
  const needle = input.query.toLowerCase();
  if (needle.length === 0) return [];
  const matches: FrameMatch[] = [];
  if (input.description) {
    collectLineMatches(input.description, needle, /*appendMatch=*/ (start) =>
      matches.push({ region: "description", line: 0, startCol: start, endCol: start + needle.length }),
    );
  }
  input.sourceText.split("\n").forEach((lineText, idx) => {
    collectLineMatches(lineText, needle, /*appendMatch=*/ (start) =>
      matches.push({ region: "code", line: idx + 1, startCol: start, endCol: start + needle.length }),
    );
  });
  return matches;
}

function collectLineMatches(text: string, needle: string, onMatch: (start: number) => void) {
  const haystack = text.toLowerCase();
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return;
    onMatch(idx);
    from = idx + needle.length;
  }
}

/**
 * Code matches grouped by 1-based line, none flagged active: the result only
 * depends on `matches`, so it stays the same while the active match moves.
 */
export function codeMatchesByLine(
  matches: readonly FrameMatch[],
): ReadonlyMap<number, readonly LineMatchRange[]> {
  const byLine = new Map<number, LineMatchRange[]>();
  for (const match of matches) {
    if (match.region !== "code") continue;
    const ranges = byLine.get(match.line) ?? [];
    ranges.push({ startCol: match.startCol, endCol: match.endCol, active: false });
    byLine.set(match.line, ranges);
  }
  return byLine;
}

/** The active match's code position, or none when it is in the description. */
export function activeCodeMatch(
  matches: readonly FrameMatch[],
  activeIndex: number,
): ActiveMatch | undefined {
  const match = matches[activeIndex];
  if (match?.region !== "code") return undefined;
  return { line: match.line, startCol: match.startCol };
}

/** Description-region ranges (columns index the description string). */
export function descriptionRanges(
  matches: readonly FrameMatch[],
  activeIndex: number,
): readonly LineMatchRange[] {
  return matches.flatMap((match, idx) => {
    if (match.region !== "description") return [];
    return [{ startCol: match.startCol, endCol: match.endCol, active: idx === activeIndex }];
  });
}

export function matchCounter(activeIndex: number, total: number): string {
  if (total === 0) return "No results";
  return `${activeIndex + 1} of ${total}`;
}
