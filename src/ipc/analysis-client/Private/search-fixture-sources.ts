// @Architecture(descriptionShort="Pure in-memory source search mirroring the Rust backend")
import { ProjectSearchMatch, ProjectSearchResult } from "./analysis-client";

const MAX_LINE_TEXT_CHARS = 200;

/**
 * Case-insensitive substring search over `[path, body]` entries, mirroring the
 * semantics of the Rust `search::search_sources` (one match per file at its
 * first matching line, 1-based line numbers, trimmed/clipped line text, `cap`
 * + `truncated`).
 */
export function searchSourceEntries(
  entries: ReadonlyArray<readonly [path: string, body: string]>,
  query: string,
  cap: number,
): ProjectSearchResult {
  const needle = query.toLowerCase();
  if (!needle) return { matches: [], truncated: false };
  const matches: ProjectSearchMatch[] = [];
  for (const [path, body] of entries) {
    const match = fileMatch(path, body, needle);
    if (!match) continue;
    if (matches.length === cap) return { matches, truncated: true };
    matches.push(match);
  }
  return { matches, truncated: false };
}

function fileMatch(path: string, body: string, needle: string): ProjectSearchMatch | undefined {
  const match = body
    .split("\n")
    .map((line, index) => ({ line, index }))
    .find(({ line }) => line.toLowerCase().includes(needle));
  if (!match) return undefined;
  return {
    path,
    line: match.index + 1,
    lineText: match.line.trim().slice(0, MAX_LINE_TEXT_CHARS),
  };
}
