/** Split points for identifier wrapping — camelCase, separators, and hard breaks. */

const SEPARATOR = /[./\-_\\]/;
const CAMEL_SPLIT = /(?<=[a-z\d])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

/** Atomic segments that should stay on one line when possible. Separators stick to
 *  the word before them so wrapped lines read `tauri-` / `analysis-`, not `-analysis`. */
export function splitIdentifierSegments(text: string): string[] {
  const raw: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (SEPARATOR.test(text[i]!)) {
      raw.push(text[i]!);
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && !SEPARATOR.test(text[j]!)) j++;
    for (const part of text.slice(i, j).split(CAMEL_SPLIT)) {
      if (part) raw.push(part);
    }
    i = j;
  }
  return attachSeparators(raw);
}

function attachSeparators(raw: string[]): string[] {
  const segments: string[] = [];
  let i = 0;
  while (i < raw.length) {
    const piece = raw[i]!;
    if (piece === ".") {
      const next = raw[i + 1];
      if (isFileExtension(next, i + 2, raw.length) && segments.length > 0) {
        segments[segments.length - 1] += `.${next}`;
        i += 2;
        continue;
      }
      if (segments.length > 0) segments[segments.length - 1] += piece;
      else segments.push(piece);
      i++;
      continue;
    }
    if (SEPARATOR.test(piece)) {
      if (segments.length > 0) segments[segments.length - 1] += piece;
      else segments.push(piece);
      i++;
      continue;
    }
    segments.push(piece);
    i++;
  }
  return segments;
}

function isFileExtension(next: string | undefined, after: number, rawLen: number): boolean {
  return (
    !!next &&
    after >= rawLen &&
    next.length <= 5 &&
    /^[a-zA-Z0-9]+$/.test(next)
  );
}

interface WrapChoice {
  lines: string[];
  maxLen: number;
}

/** Wrap `text` into lines of at most `maxCharsPerLine`. Prefers camelCase / separator
 *  boundaries; when line count ties, prefers the most balanced split. */
export function wrapIdentifierLines(text: string, maxCharsPerLine: number): string[] {
  const limit = Math.max(1, maxCharsPerLine);
  if (!text) return [""];

  const segments = expandOversized(splitIdentifierSegments(text), limit);
  const best = wrapSegments(segments, limit);
  return best.lines.length ? best.lines : [text];
}

export function countWrappedLines(text: string, maxCharsPerLine: number): number {
  return wrapIdentifierLines(text, maxCharsPerLine).length;
}

function expandOversized(segments: string[], limit: number): string[] {
  const out: string[] = [];
  for (const seg of segments) {
    if (seg.length <= limit) {
      out.push(seg);
      continue;
    }
    const fileChunks = splitOversizedFile(seg, limit);
    if (fileChunks) {
      out.push(...fileChunks);
      continue;
    }
    for (let i = 0; i < seg.length; i += limit) {
      out.push(seg.slice(i, i + limit));
    }
  }
  return out;
}

/** When `basename.ext` exceeds the limit, break the base name — keep `.ext` whole. */
function splitOversizedFile(seg: string, limit: number): string[] | null {
  const dot = seg.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = seg.slice(dot);
  if (!/^\.[a-zA-Z0-9]{1,5}$/.test(ext)) return null;
  const base = seg.slice(0, dot);
  const chunks: string[] = [];
  for (let i = 0; i < base.length; i += limit) {
    chunks.push(base.slice(i, i + limit));
  }
  const last = chunks.pop() ?? "";
  const withExt = last + ext;
  if (withExt.length <= limit) {
    if (withExt) chunks.push(withExt);
    return chunks;
  }
  if (last) chunks.push(last);
  chunks.push(ext);
  return chunks;
}

function wrapSegments(segments: string[], limit: number): WrapChoice {
  const memo = new Map<number, WrapChoice>();

  function solve(from: number): WrapChoice {
    if (from >= segments.length) return { lines: [], maxLen: 0 };
    const hit = memo.get(from);
    if (hit) return hit;

    let best: WrapChoice | null = null;
    for (let end = from + 1; end <= segments.length; end++) {
      const len = segmentLen(segments, from, end);
      if (len > limit) break;
      const tail = solve(end);
      const candidate: WrapChoice = {
        lines: [joinSegments(segments, from, end), ...tail.lines],
        maxLen: Math.max(len, tail.maxLen),
      };
      best = betterWrap(best, candidate);
    }

    const fallback: WrapChoice = {
      lines: [segments.slice(from).join("")],
      maxLen: segmentLen(segments, from, segments.length),
    };
    const result = best ?? fallback;
    memo.set(from, result);
    return result;
  }

  return solve(0);
}

function segmentLen(segments: string[], from: number, to: number): number {
  let n = 0;
  for (let i = from; i < to; i++) n += segments[i]!.length;
  return n;
}

function joinSegments(segments: string[], from: number, to: number): string {
  return segments.slice(from, to).join("");
}

function betterWrap(a: WrapChoice | null, b: WrapChoice): WrapChoice {
  if (!a) return b;
  if (a.lines.length !== b.lines.length) return a.lines.length < b.lines.length ? a : b;
  return a.maxLen <= b.maxLen ? a : b;
}
