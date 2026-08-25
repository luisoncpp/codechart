// @Architecture(descriptionShort="Detects moved lines across files in diff overlays using greedy block matching")
import type { FileLineDiff, MovedLocation } from "./line-diff-types";
import type { RenamePair } from "./types";

interface LineItem {
  line: number;
  text: string;
  trimmed: string;
  significant: boolean;
}

interface BlockMatch {
  sourcePath: string;
  destPath: string;
  sourceIdx: number;
  destIdx: number;
  length: number;
  score: number;
}

const TRIVIAL = new Set(["", "{", "}", "};", "});", "},", ");", "[", "]", "],", "(", ")", ";", ",", "//", "/*", "*/", "*", "export {};"]);

function isSignificant(text: string): boolean {
  const t = text.trim();
  return t.length >= 3 && !TRIVIAL.has(t);
}

export function detectMovedLines(
  diffs: ReadonlyMap<string, FileLineDiff>,
  renames?: readonly RenamePair[],
): Map<string, FileLineDiff> {
  if (diffs.size < 2) return new Map(diffs);
  const skipPairs = new Set((renames ?? []).map((r) => `${r.from}\0${r.to}`));
  const remByFile = new Map<string, LineItem[]>();
  const addByFile = new Map<string, LineItem[]>();

  for (const [path, diff] of diffs) {
    remByFile.set(path, extractRemoved(diff));
    addByFile.set(path, extractAdded(diff));
  }

  const { movedRem, movedAdd } = resolveMovedLines(remByFile, addByFile, skipPairs);
  return applyMovedResults(diffs, movedRem, movedAdd);
}

function extractRemoved(diff: FileLineDiff): LineItem[] {
  if (diff.removedLineDetails && diff.removedLineDetails.length > 0) {
    return diff.removedLineDetails.map((d) => ({
      line: d.oldLine,
      text: d.text,
      trimmed: d.text.trim(),
      significant: isSignificant(d.text),
    }));
  }
  const items: LineItem[] = [];
  let oldLine = 1;
  for (const [, lines] of diff.removeBeforeLine) {
    for (const text of lines) {
      items.push({ line: oldLine++, text, trimmed: text.trim(), significant: isSignificant(text) });
    }
  }
  return items;
}

function extractAdded(diff: FileLineDiff): LineItem[] {
  const items: LineItem[] = [];
  if (diff.addedLineTexts) {
    for (const [line, text] of diff.addedLineTexts) {
      items.push({ line, text, trimmed: text.trim(), significant: isSignificant(text) });
    }
    return items;
  }
  for (const line of diff.addedLineNumbers) {
    items.push({ line, text: "", trimmed: "", significant: false });
  }
  return items;
}

function resolveMovedLines(
  remByFile: Map<string, LineItem[]>,
  addByFile: Map<string, LineItem[]>,
  skipPairs: Set<string>,
) {
  const movedRem = new Map<string, Map<number, MovedLocation>>();
  const movedAdd = new Map<string, Map<number, MovedLocation>>();
  const remClaimed = new Map<string, Set<number>>();
  const addClaimed = new Map<string, Set<number>>();

  const blocks = collectAllBlocks(remByFile, addByFile, skipPairs);
  blocks.sort((a, b) => b.score - a.score || b.length - a.length);

  for (const b of blocks) {
    claimBlock(b, remByFile.get(b.sourcePath)!, addByFile.get(b.destPath)!, {
      remClaimed, addClaimed, movedRem, movedAdd,
    });
  }

  claimSingleLines(remByFile, addByFile, skipPairs, {
    remClaimed, addClaimed, movedRem, movedAdd,
  });

  return { movedRem, movedAdd };
}

function collectAllBlocks(
  remByFile: Map<string, LineItem[]>,
  addByFile: Map<string, LineItem[]>,
  skipPairs: Set<string>,
): BlockMatch[] {
  const out: BlockMatch[] = [];
  for (const [srcPath, rems] of remByFile) {
    if (rems.length === 0) continue;
    for (const [dstPath, adds] of addByFile) {
      if (srcPath === dstPath || adds.length === 0 || skipPairs.has(`${srcPath}\0${dstPath}`)) continue;
      findFileBlocks(srcPath, dstPath, rems, adds, out);
    }
  }
  return out;
}

function findFileBlocks(
  src: string, dst: string, rems: LineItem[], adds: LineItem[], out: BlockMatch[],
) {
  for (let i = 0; i < rems.length; i++) {
    for (let j = 0; j < adds.length; j++) {
      const b = matchRunAt(src, dst, rems, adds, i, j);
      if (b) out.push(b);
    }
  }
}

function matchRunAt(
  src: string, dst: string, rems: LineItem[], adds: LineItem[], i: number, j: number,
): BlockMatch | null {
  let len = 0;
  let sigCount = 0;
  let exactCount = 0;
  while (i + len < rems.length && j + len < adds.length) {
    const r = rems[i + len]!;
    const a = adds[j + len]!;
    if (r.trimmed !== a.trimmed || r.trimmed.length === 0) break;
    if (r.significant) sigCount++;
    if (r.text === a.text) exactCount++;
    len++;
  }
  if (len < 2 || sigCount === 0) return null;
  const score = len * 100 + sigCount * 50 + exactCount;
  return { sourcePath: src, destPath: dst, sourceIdx: i, destIdx: j, length: len, score };
}

interface ClaimContext {
  remClaimed: Map<string, Set<number>>;
  addClaimed: Map<string, Set<number>>;
  movedRem: Map<string, Map<number, MovedLocation>>;
  movedAdd: Map<string, Map<number, MovedLocation>>;
}

function claimBlock(b: BlockMatch, rems: LineItem[], adds: LineItem[], ctx: ClaimContext) {
  const remSet = getOrCreateSet(ctx.remClaimed, b.sourcePath);
  const addSet = getOrCreateSet(ctx.addClaimed, b.destPath);
  for (let k = 0; k < b.length; k++) {
    if (remSet.has(rems[b.sourceIdx + k]!.line) || addSet.has(adds[b.destIdx + k]!.line)) return;
  }
  const remMap = getOrCreateMap(ctx.movedRem, b.sourcePath);
  const addMap = getOrCreateMap(ctx.movedAdd, b.destPath);
  for (let k = 0; k < b.length; k++) {
    const rLine = rems[b.sourceIdx + k]!.line;
    const aLine = adds[b.destIdx + k]!.line;
    remSet.add(rLine);
    addSet.add(aLine);
    remMap.set(rLine, { path: b.destPath, line: aLine });
    addMap.set(aLine, { path: b.sourcePath, line: rLine });
  }
}

function claimSingleLines(
  remByFile: Map<string, LineItem[]>,
  addByFile: Map<string, LineItem[]>,
  skipPairs: Set<string>,
  ctx: ClaimContext,
) {
  for (const [src, rems] of remByFile) {
    const remSet = getOrCreateSet(ctx.remClaimed, src);
    for (const r of rems) {
      if (remSet.has(r.line) || !r.significant) continue;
      matchSingleCandidate(src, r, addByFile, skipPairs, ctx);
    }
  }
}

function matchSingleCandidate(
  src: string, r: LineItem, addByFile: Map<string, LineItem[]>, skipPairs: Set<string>, ctx: ClaimContext,
) {
  for (const [dst, adds] of addByFile) {
    if (src === dst || skipPairs.has(`${src}\0${dst}`)) continue;
    const addSet = getOrCreateSet(ctx.addClaimed, dst);
    const match = adds.find((a) => !addSet.has(a.line) && a.trimmed === r.trimmed);
    if (!match) continue;
    getOrCreateSet(ctx.remClaimed, src).add(r.line);
    addSet.add(match.line);
    getOrCreateMap(ctx.movedRem, src).set(r.line, { path: dst, line: match.line });
    getOrCreateMap(ctx.movedAdd, dst).set(match.line, { path: src, line: r.line });
    return;
  }
}

function applyMovedResults(
  diffs: ReadonlyMap<string, FileLineDiff>,
  movedRem: Map<string, Map<number, MovedLocation>>,
  movedAdd: Map<string, Map<number, MovedLocation>>,
): Map<string, FileLineDiff> {
  const result = new Map<string, FileLineDiff>();
  for (const [path, diff] of diffs) {
    const remMap = movedRem.get(path);
    const addMap = movedAdd.get(path);
    result.set(path, {
      ...diff,
      ...(remMap && remMap.size > 0 ? { movedRemovedLines: remMap } : {}),
      ...(addMap && addMap.size > 0 ? { movedAddedLines: addMap } : {}),
    });
  }
  return result;
}

function getOrCreateSet<K, V>(map: Map<K, Set<V>>, key: K): Set<V> {
  let s = map.get(key);
  if (!s) { s = new Set(); map.set(key, s); }
  return s;
}

function getOrCreateMap<K, K2, V>(map: Map<K, Map<K2, V>>, key: K): Map<K2, V> {
  let m = map.get(key);
  if (!m) { m = new Map(); map.set(key, m); }
  return m;
}
