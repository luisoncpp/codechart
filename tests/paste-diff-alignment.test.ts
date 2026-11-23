/**
 * Regression net for "the pasted diff paints the wrong lines" — a bug that has come back
 * through a different layer each time (bare headers, unprefixed context, CRLF, a drifted or
 * unpatched live file, unrelated local edits). Instead of one example per past cause, this
 * generates the diff from a known edit list and runs a MATRIX of paste shapes × live-file
 * states through the real pipeline (store → overlay → `buildModuleDiffDisplay`, the row
 * builder every diff panel uses), asserting the invariant all those bugs broke:
 *
 *   the rendered `+` rows are exactly the diff's added lines, in order, and the rendered
 *   `-` rows exactly its removed lines — with none demoted by the misalignment guard.
 *
 * A new paste shape or live-file state is one more entry in a table below, not a new test.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { buildModuleDiffDisplay } from "../src/domain/diff";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { ProjectGraph } from "../src/domain/graph";

const PATH = "src/core/store.ts";
const CONTEXT = 3;

/** 40 distinct lines, with the shapes that broke parsers before: blanks and a `-- ` comment. */
const BEFORE = Array.from({ length: 40 }, (_, i) => {
  if (i % 9 === 4) return "";
  if (i === 20) return "-- sql-style comment";
  // Removed by edit #4: serializes as `--- ...`, which a prefix-only header rule misreads.
  if (i === 33) return "-- removed sql comment";
  return `line ${i + 1} ${"x".repeat(i % 4)}`;
});

interface Edit {
  /** 0-based index into BEFORE. */
  at: number;
  del: number;
  add: string[];
}

/** Far enough apart (> 2×CONTEXT) that every edit is its own hunk. */
const EDITS: Edit[] = [
  { at: 5, del: 0, add: ["  /** added doc */", "  addedField = true;"] },
  { at: 14, del: 1, add: ["line 15 replaced"] },
  { at: 24, del: 2, add: [] },
  { at: 33, del: 1, add: ["-- still a comment, now added", "line 34 two"] },
];

function applyEdits(lines: readonly string[]): string[] {
  const out: string[] = [];
  let cursor = 0;
  for (const edit of EDITS) {
    out.push(...lines.slice(cursor, edit.at), ...edit.add);
    cursor = edit.at + edit.del;
  }
  return [...out, ...lines.slice(cursor)];
}

const AFTER = applyEdits(BEFORE);
const ADDED = EDITS.flatMap((edit) => edit.add);
const REMOVED = EDITS.flatMap((edit) => BEFORE.slice(edit.at, edit.at + edit.del));

interface PasteShape {
  name: string;
  gitHeader: boolean;
  /** LLM-style: blank context rows lose their leading space. */
  relaxedContext: boolean;
  crlf: boolean;
}

function unifiedDiff(shape: PasteShape): string {
  const out = shape.gitHeader ? [`diff --git a/${PATH} b/${PATH}`, "index 1111111..2222222 100644"] : [];
  out.push(`--- a/${PATH}`, `+++ b/${PATH}`);
  let shift = 0;
  for (const edit of EDITS) {
    const from = Math.max(0, edit.at - CONTEXT);
    const to = Math.min(BEFORE.length, edit.at + edit.del + CONTEXT);
    const oldCount = to - from;
    const newCount = oldCount - edit.del + edit.add.length;
    out.push(`@@ -${from + 1},${oldCount} +${from + 1 + shift},${newCount} @@`);
    const ctx = (text: string) => (shape.relaxedContext && text === "" ? "" : ` ${text}`);
    out.push(...BEFORE.slice(from, edit.at).map(ctx));
    out.push(...BEFORE.slice(edit.at, edit.at + edit.del).map((text) => `-${text}`));
    out.push(...edit.add.map((text) => `+${text}`));
    out.push(...BEFORE.slice(edit.at + edit.del, to).map(ctx));
    shift += edit.add.length - edit.del;
  }
  return out.join(shape.crlf ? "\r\n" : "\n") + (shape.crlf ? "\r\n" : "\n");
}

interface LiveState {
  name: string;
  lines: () => string[];
}

/**
 * Edits the diff knows nothing about — the reported case: a rewritten context line of the
 * pure-add hunk (#1) and of the replace hunk (#2), plus lines inserted between hunks.
 */
function withLocalEdits(lines: readonly string[]): string[] {
  const out = [...lines];
  out[out.indexOf(BEFORE[3]!)] = "locally rewritten context of hunk 1";
  out[out.indexOf(BEFORE[12]!)] = "locally rewritten context of hunk 2";
  out.splice(out.indexOf(BEFORE[10]!), 0, "// local note A", "// local note B");
  return out;
}

const LIVE_STATES: LiveState[] = [
  { name: "unpatched", lines: () => [...BEFORE] },
  { name: "patched", lines: () => [...AFTER] },
  { name: "unpatched + local edits", lines: () => withLocalEdits(BEFORE) },
  { name: "patched + local edits", lines: () => withLocalEdits(AFTER) },
  { name: "patched, shifted down", lines: () => ["// new header", "// two", ...AFTER] },
];

const SHAPES: PasteShape[] = [
  { name: "git diff", gitHeader: true, relaxedContext: false, crlf: false },
  { name: "bare diff -u", gitHeader: false, relaxedContext: false, crlf: false },
  { name: "LLM relaxed context", gitHeader: true, relaxedContext: true, crlf: false },
  { name: "CRLF paste", gitHeader: false, relaxedContext: true, crlf: true },
];

async function renderedRows(diff: string, live: string) {
  const client: AnalysisClient = {
    analyzeProject: async () => goldenGraph as unknown as ProjectGraph,
    readModuleSource: async (_root, path) => (path === PATH ? live : ""),
    searchModuleSources: async () => ({ matches: [], truncated: false }),
  };
  const store = testGraphSessionStore(client);
  await store.loadProject("/x");
  await store.applyDiffFromPaste(diff);
  const source = store.getSourceCache().get(PATH) ?? live;
  return buildModuleDiffDisplay(source, store.getDiffOverlay()?.lineDiffByPath.get(PATH));
}

afterEach(() => vi.restoreAllMocks());

describe("pasted diff rows stay aligned with their text", () => {
  for (const shape of SHAPES) {
    for (const state of LIVE_STATES) {
      for (const liveCrlf of [false, true]) {
        const name = `${shape.name} × ${state.name}${liveCrlf ? " (CRLF file)" : ""}`;
        it(name, async () => {
          const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
          const live = state.lines().join(liveCrlf ? "\r\n" : "\n") + (liveCrlf ? "\r\n" : "\n");
          const rows = await renderedRows(unifiedDiff(shape), live);
          const texts = (kinds: string[]) =>
            rows.filter((row) => kinds.includes(row.kind)).map((row) => row.text.trimEnd());
          expect(texts(["add", "move-add"])).toEqual(ADDED.map((text) => text.trimEnd()));
          expect(texts(["remove", "move-remove"])).toEqual(REMOVED.map((text) => text.trimEnd()));
          expect(warn).not.toHaveBeenCalled();
        });
      }
    }
  }
});

describe("misalignment guard", () => {
  it("renders a `+` whose text is not in the file as context, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unrelated = Array.from({ length: 40 }, (_, i) => `unrelated ${i}`).join("\n");
    const rows = await renderedRows(unifiedDiff(SHAPES[0]!), unrelated);
    expect(rows.filter((row) => row.kind === "add")).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
