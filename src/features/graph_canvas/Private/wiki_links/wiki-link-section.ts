import { isMarkdownPath } from "./wiki-link-target";

/** Case-insensitive key: whitespace and hyphens collapse to one hyphen. */
export function normalizeSectionKey(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, "-");
}

export interface SectionHit {
  line: number;
  anchorId: string;
}

const SECTION_MARKER = /@Section\(\s*([^)]+?)\s*\)/;
const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/** First @Section marker or ATX heading matching `section` (1-based line). */
// @Section(Section matching)
export function findSectionInSource(
  source: string,
  path: string,
  section: string,
): SectionHit | null {
  const key = normalizeSectionKey(section);
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const hit = matchLine(lines[i]!, path, key);
    if (hit) return { line: i + 1, anchorId: hit };
  }
  return null;
}

function matchLine(line: string, path: string, key: string): string | null {
  if (isMarkdownPath(path)) return matchAtxHeading(line, key);
  const marker = SECTION_MARKER.exec(line);
  if (!marker) return null;
  const name = marker[1]!.trim();
  const anchorId = normalizeSectionKey(name);
  return anchorId === key ? anchorId : null;
}

function matchAtxHeading(line: string, key: string): string | null {
  const match = ATX_HEADING.exec(line);
  if (!match) return null;
  const title = match[2]!.replace(/\s+#+\s*$/, "").trim();
  const anchorId = normalizeSectionKey(title);
  return anchorId === key ? anchorId : null;
}
