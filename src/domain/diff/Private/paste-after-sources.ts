// @Architecture(descriptionShort="Anchors a pasted diff's hunks in live files: rebuilt after-text + header→real line map")
import type { HunkRow, PasteHunk } from "./paste-hunks";

/** The text the panels should render, and where each diff after-line number really sits in it. */
export interface AnchoredPasteFile {
  source: string;
  lineMap: ReadonlyMap<number, number>;
}

type Side = "after" | "before";

interface Placement {
  at: number;
  lead: number;
  rows: readonly HunkRow[];
  side: Side;
}

interface AnchorState {
  lines: readonly string[];
  out: string[];
  cursor: number;
  /** Old-side line number that the live line at `cursor` corresponds to. */
  oldAtCursor: number;
  lineMap: Map<number, number>;
}

/**
 * A pasted diff has no snapshot, and the live file may be patched, unpatched, or either
 * one with unrelated local edits. Locate each hunk on its own — by its after side (already
 * applied: keep the live lines) or its before side (apply it) — nearest to where the
 * previous hunk left off, trimming mismatched edge context like `git apply` fuzz does.
 * A hunk found nowhere is skipped. Null when no hunk could be anchored.
 */
export function anchorPasteHunks(live: string, hunks: readonly PasteHunk[]): AnchoredPasteFile | null {
  const eol = live.includes("\r\n") ? "\r\n" : "\n";
  const state: AnchorState = {
    lines: live.split(/\r?\n/), out: [], cursor: 0, oldAtCursor: 1, lineMap: new Map(),
  };
  let placed = 0;
  for (const hunk of hunks) {
    const placement = locateHunk(state, hunk);
    if (!placement) continue;
    emitHunk(state, hunk, placement);
    placed++;
  }
  if (placed === 0) return null;
  state.out.push(...state.lines.slice(state.cursor));
  return { source: state.out.join(eol), lineMap: state.lineMap };
}

function locateHunk(state: AnchorState, hunk: PasteHunk): Placement | null {
  const leadCtx = edgeContext(hunk.rows);
  const trailCtx = edgeContext([...hunk.rows].reverse());
  for (let fuzz = 0; fuzz <= leadCtx + trailCtx; fuzz++) {
    for (let lead = Math.min(fuzz, leadCtx); lead >= 0; lead--) {
      const trail = fuzz - lead;
      if (trail > trailCtx) break;
      const rows = hunk.rows.slice(lead, hunk.rows.length - trail);
      const expected = state.cursor + hunk.oldStart + lead - state.oldAtCursor;
      const found = nearestPlacement({ state, rows, expected, fuzzed: fuzz > 0 });
      if (found) return { ...found, lead };
    }
  }
  return null;
}

function edgeContext(rows: readonly HunkRow[]): number {
  const firstChange = rows.findIndex((row) => row.kind !== "ctx");
  return firstChange === -1 ? 0 : firstChange;
}

interface SearchInput {
  state: AnchorState;
  rows: readonly HunkRow[];
  expected: number;
  fuzzed: boolean;
}

/**
 * A side holding its own changed rows (`+` for after, `-` for before) is a real anchor; a
 * pure-context side (the before side of a pure add, the after side of a pure delete) only
 * says "these lines are adjacent" — so it loses to a real anchor at the same fuzz level.
 */
function nearestPlacement(input: SearchInput): Omit<Placement, "lead"> | null {
  const candidates = (["after", "before"] as const).flatMap((side) => {
    const at = nearestMatch(input, side);
    return at === null ? [] : [{ at, side, rows: input.rows, anchored: hasOwnChange(input.rows, side) }];
  });
  candidates.sort((a, b) =>
    Number(b.anchored) - Number(a.anchored)
    || Math.abs(a.at - input.expected) - Math.abs(b.at - input.expected));
  const best = candidates[0];
  return best ? { at: best.at, side: best.side, rows: best.rows } : null;
}

function hasOwnChange(rows: readonly HunkRow[], side: Side): boolean {
  const own = side === "after" ? "add" : "del";
  return rows.some((row) => row.kind === own);
}

function nearestMatch(input: SearchInput, side: Side): number | null {
  const own = side === "after" ? "add" : "del";
  const texts = input.rows.filter((row) => row.kind === "ctx" || row.kind === own).map((row) => row.text);
  // One fuzzed context line matches almost anywhere; demand at least two to anchor on.
  const minimum = input.fuzzed && !hasOwnChange(input.rows, side) ? 2 : 1;
  if (texts.length < minimum) return null;
  const { lines, cursor } = input.state;
  let best: number | null = null;
  for (let at = cursor; at + texts.length <= lines.length; at++) {
    if (!matchesAt(lines, texts, at)) continue;
    if (best === null || Math.abs(at - input.expected) < Math.abs(best - input.expected)) best = at;
  }
  return best;
}

function matchesAt(lines: readonly string[], texts: readonly string[], at: number): boolean {
  return texts.every((text, i) => lines[at + i]!.trimEnd() === text.trimEnd());
}

function emitHunk(state: AnchorState, hunk: PasteHunk, placement: Placement): void {
  const { lines, out, lineMap } = state;
  out.push(...lines.slice(state.cursor, placement.at));
  let live = placement.at;
  let newLine = hunk.newStart + placement.lead;
  for (const row of placement.rows) {
    const keepsLive = row.kind === "ctx" || (placement.side === "after" && row.kind === "add");
    if (row.kind === "del") {
      if (placement.side === "before") live++;
      continue;
    }
    out.push(keepsLive ? lines[live++]! : row.text);
    lineMap.set(newLine++, out.length);
  }
  // A removal at the hunk's end is keyed on the line right after it.
  lineMap.set(newLine, out.length + 1);
  state.cursor = live;
  state.oldAtCursor = hunk.oldStart + placement.lead
    + placement.rows.filter((row) => row.kind !== "add").length;
}
