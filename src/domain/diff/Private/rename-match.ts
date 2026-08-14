// @Architecture(descriptionShort="1:1 greedy matching of deleted vs added modules by fingerprint")
import type { RenamePair } from "./types";

const SCORE_THRESHOLD = 0.4;
const UNIQUE_BASENAME_FLOOR = 0.5;
const PAIRWISE_CAP = 500;

export interface RenameFingerprint {
  id: string;
  basename: string;
  ext: string;
  lines: ReadonlySet<string>;
  symbols: ReadonlySet<string>;
}

interface ScoredPair {
  from: string;
  to: string;
  score: number;
}

/** Whitespace-normalized non-empty lines. */
function lineFingerprint(text: string): Set<string> {
  const lines = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (line) lines.add(line);
  }
  return lines;
}

export function fingerprintModule(input: {
  id: string;
  source: string;
  symbols: readonly string[];
}): RenameFingerprint {
  return {
    id: input.id,
    basename: basenameOf(input.id),
    ext: extOf(input.id),
    lines: lineFingerprint(input.source),
    symbols: new Set(input.symbols),
  };
}

/** Greedy 1:1 pairs above the similarity threshold. */
export function matchRenamePairs(
  deleted: readonly RenameFingerprint[],
  added: readonly RenameFingerprint[],
): RenamePair[] {
  const unique = uniqueBasenames(deleted, added);
  return greedyPick(scorePairs(deleted, added, unique));
}

function scorePairs(
  deleted: readonly RenameFingerprint[],
  added: readonly RenameFingerprint[],
  unique: ReadonlySet<string>,
): ScoredPair[] {
  const capped = deleted.length * added.length > PAIRWISE_CAP;
  const scored: ScoredPair[] = [];
  for (const from of deleted) {
    for (const to of added) {
      if (!shouldCompare(from, to, capped)) continue;
      const score = pairScore(from, to, unique.has(from.basename));
      if (score < SCORE_THRESHOLD) continue;
      scored.push({ from: from.id, to: to.id, score });
    }
  }
  return scored;
}

function shouldCompare(
  from: RenameFingerprint,
  to: RenameFingerprint,
  capped: boolean,
): boolean {
  if (from.ext !== to.ext) return false;
  if (!capped) return true;
  if (from.basename === to.basename) return true;
  return hasOverlap(from.symbols, to.symbols);
}

function pairScore(
  from: RenameFingerprint,
  to: RenameFingerprint,
  uniqueSharedBasename: boolean,
): number {
  const content = Math.max(
    jaccard(from.lines, to.lines),
    jaccard(from.symbols, to.symbols),
  );
  if (uniqueSharedBasename && from.basename === to.basename) {
    return Math.max(content, UNIQUE_BASENAME_FLOOR);
  }
  return content;
}

function greedyPick(scored: ScoredPair[]): RenamePair[] {
  const ordered = [...scored].sort((a, b) => b.score - a.score);
  const usedFrom = new Set<string>();
  const usedTo = new Set<string>();
  const pairs: RenamePair[] = [];
  for (const pair of ordered) {
    if (usedFrom.has(pair.from) || usedTo.has(pair.to)) continue;
    usedFrom.add(pair.from);
    usedTo.add(pair.to);
    pairs.push({ from: pair.from, to: pair.to });
  }
  return pairs;
}

function uniqueBasenames(
  deleted: readonly RenameFingerprint[],
  added: readonly RenameFingerprint[],
): ReadonlySet<string> {
  const del = countBy(deleted);
  const add = countBy(added);
  const unique = new Set<string>();
  for (const [name, n] of del) {
    if (n === 1 && add.get(name) === 1) unique.add(name);
  }
  return unique;
}

function countBy(items: readonly RenameFingerprint[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.basename, (counts.get(item.basename) ?? 0) + 1);
  }
  return counts;
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  for (const item of smaller) {
    if (larger.has(item)) inter++;
  }
  return inter / (a.size + b.size - inter);
}

function hasOverlap(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const item of a) {
    if (b.has(item)) return true;
  }
  return false;
}

function basenameOf(path: string): string {
  return (path.split("/").pop() ?? path).toLowerCase();
}

function extOf(path: string): string {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}
