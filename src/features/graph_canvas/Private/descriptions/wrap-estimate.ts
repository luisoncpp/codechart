// @Architecture(descriptionShort="Character-count estimate of CSS word wrapping for L0 card text")

/** Lines `text` wraps onto at `charsPerLine`, breaking at spaces and after
 *  hyphens like CSS; an over-long segment spills onto extra lines. */
export function wrappedLineCount(text: string, charsPerLine: number): number {
  const segments = wrapSegments(text);
  let lines = 1;
  let used = 0;
  let afterHyphen = false;
  for (const segment of segments) {
    const gap = used > 0 && !afterHyphen ? 1 : 0;
    if (used + gap + segment.length <= charsPerLine) {
      used += gap + segment.length;
    } else {
      if (used > 0) lines++;
      lines += Math.max(0, Math.ceil(segment.length / charsPerLine) - 1);
      used = segment.length % charsPerLine || charsPerLine;
    }
    afterHyphen = segment.endsWith("-");
  }
  return lines;
}

/** Does any unbreakable segment exceed a line? CSS would overflow it. */
export function hasOverlongSegment(text: string, charsPerLine: number): boolean {
  return wrapSegments(text).some((segment) => segment.length > charsPerLine);
}

function wrapSegments(text: string): string[] {
  return text.trim().replace(/-/g, "- ").split(/\s+/).filter(Boolean);
}
