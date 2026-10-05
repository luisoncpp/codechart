// @Architecture(descriptionShort="Rewrites stale pasted hunk headers to where their new-side lines match the current file")
import { parseHeaderPath, parseHunkHeader, pathFromDiffGit } from "./parse-line-diff";
import { scanDiffLines, type DiffLine } from "./scan-diff-lines";

interface Hunk {
  headerIndex: number;
  oldStart: number;
  newStart: number;
  /** New-side lines (context + added), trimmed, in order. */
  newSide: string[];
}

/**
 * LLM-written patches often carry hunk headers that are a few lines off. Every parser
 * trusts `@@ -a +b @@`, so a stale header shifts each row of the hunk. Move each hunk to
 * the offset nearest its declared start where all its new-side lines match the current
 * file; leave it alone when nothing matches (the source is unknown or the diff is wrong).
 */
export function realignHunks(text: string, sources: ReadonlyMap<string, string>): string {
  const realigner = new HunkRealigner(text, sources);
  scanDiffLines(text).forEach((line, index) => realigner.visit(line, index));
  return realigner.finish();
}

class HunkRealigner {
  private readonly out: string[];
  private fileLines: string[] | null = null;
  private hunk: Hunk | null = null;

  constructor(text: string, private readonly sources: ReadonlyMap<string, string>) {
    this.out = text.split(/\r?\n/);
  }

  visit({ text: raw, header }: DiffLine, index: number): void {
    if (raw.startsWith("diff --git ") || header === "new") {
      this.closeHunk();
      const lines = sourceFor({ raw, header, sources: this.sources });
      if (lines || !header) this.fileLines = lines;
      return;
    }
    if (header) return;
    const parsed = parseHunkHeader(raw);
    if (parsed) {
      this.closeHunk();
      this.hunk = { headerIndex: index, ...parsed, newSide: [] };
      return;
    }
    const content = this.hunk ? newSideContent(raw) : null;
    if (content !== null) this.hunk!.newSide.push(content);
  }

  finish(): string {
    this.closeHunk();
    return this.out.join("\n");
  }

  private closeHunk(): void {
    const { hunk, fileLines } = this;
    this.hunk = null;
    if (!hunk || !fileLines) return;
    this.out[hunk.headerIndex] = realignedHeader(this.out[hunk.headerIndex]!, hunk, fileLines);
  }
}

interface PathLine {
  raw: string;
  header: string | null;
  sources: ReadonlyMap<string, string>;
}

/** Trimmed current lines of the file a `diff --git` / `+++` line names, if known. */
function sourceFor({ raw, header, sources }: PathLine): string[] | null {
  const path = header ? parseHeaderPath(raw.slice(4)) : pathFromDiffGit(raw);
  if (!path || path === "/dev/null") return null;
  return splitSource(sources.get(path));
}

/** Trimmed new-side text of a hunk line, or null for removed / marker lines. */
function newSideContent(raw: string): string | null {
  if (raw.startsWith("-") || raw.startsWith("#") || raw.startsWith("\\")) return null;
  return contentOf(raw).trim();
}

function splitSource(source: string | undefined): string[] | null {
  return source === undefined ? null : source.split(/\r?\n/).map((line) => line.trim());
}

function contentOf(raw: string): string {
  return raw.startsWith("+") || raw.startsWith(" ") ? raw.slice(1) : raw;
}

function realignedHeader(raw: string, hunk: Hunk, fileLines: readonly string[]): string {
  const start = nearestMatch(hunk, fileLines);
  if (start === null || start === hunk.newStart) return raw;
  const delta = start - hunk.newStart;
  return raw.replace(
    /^@@ -(\d+)((?:,\d+)?) \+(\d+)((?:,\d+)?) @@/,
    `@@ -${Math.max(1, hunk.oldStart + delta)}$2 +${start}$4 @@`,
  );
}

/** 1-based start line nearest `hunk.newStart` where every new-side line matches. */
function nearestMatch(hunk: Hunk, fileLines: readonly string[]): number | null {
  if (hunk.newSide.length === 0) return null;
  const maxStart = fileLines.length - hunk.newSide.length + 1;
  for (let distance = 0; distance <= fileLines.length; distance++) {
    for (const start of [hunk.newStart - distance, hunk.newStart + distance]) {
      if (start < 1 || start > maxStart) continue;
      if (matchesAt(hunk.newSide, fileLines, start)) return start;
    }
  }
  return null;
}

function matchesAt(newSide: readonly string[], fileLines: readonly string[], start: number): boolean {
  return newSide.every((line, i) => fileLines[start - 1 + i] === line);
}
