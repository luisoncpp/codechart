import { describe, it, expect } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { anchorPasteDiff, attachLineDiff, buildModuleDiffDisplay } from "../src/domain/diff";
import type { GraphDiffOverlay } from "../src/domain/diff";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { ProjectGraph } from "../src/domain/graph";

const PATH = "src/widget.ts";

// Header numbers index the AFTER side, while the live file is at the BEFORE side AND
// carries unrelated local edits, so no header number is trustworthy.
const BEFORE = [
  "export interface Options {",
  "  name: string;",
  "}",
  "",
  "function helper() {}",
  "",
  "// @first-marker",
  "// @second-marker",
  "export function save(mode: string) {",
  "  write(mode);",
  "}",
].join("\n");

const DIFF_LINES = [
  `diff --git a/${PATH} b/${PATH}`,
  `--- a/${PATH}`,
  `+++ b/${PATH}`,
  "@@ -1,4 +1,6 @@",
  " export interface Options {",
  "   name: string;",
  "+  /** Added doc. */",
  "+  verbose: boolean;",
  " }",
  "",
  "@@ -6,6 +8,6 @@",
  "",
  " // @first-marker",
  " // @second-marker",
  "-export function save(mode: string) {",
  "+export function save(mode: string, verbose: boolean) {",
  "   write(mode);",
  " }",
  "",
];

const diffFor = (path: string): string => DIFF_LINES.join("\n").split(PATH).join(path);

/** A local edit the diff knows nothing about: two new comment lines and swapped markers. */
const LOCALLY_EDITED = BEFORE.replace(
  "// @first-marker\n// @second-marker",
  "// local note one\n// local note two\n// @second-marker\n// @first-marker",
);

function anchored(live: string): GraphDiffOverlay {
  const base = attachLineDiff({} as never, diffFor(PATH));
  return anchorPasteDiff(base, new Map([[PATH, live]]));
}

/** What the preview frame renders: `+`/`-`/` ` + the row text. */
function rendered(overlay: GraphDiffOverlay, live: string): string[] {
  const source = overlay.afterSourceByPath.get(PATH) ?? live;
  const mark = { context: " ", add: "+", remove: "-", "move-add": "+", "move-remove": "-" };
  return buildModuleDiffDisplay(source, overlay.lineDiffByPath.get(PATH))
    .map((row) => `${mark[row.kind]}${row.text}`);
}

const EXPECTED_INTERFACE = [
  " export interface Options {",
  "   name: string;",
  "+  /** Added doc. */",
  "+  verbose: boolean;",
  " }",
];

const OLD_SAVE = "-export function save(mode: string) {";
const NEW_SAVE = "+export function save(mode: string, verbose: boolean) {";

describe("anchorPasteDiff", () => {
  it("applies the patch to a live file still at the before side", () => {
    const rows = rendered(anchored(BEFORE), BEFORE);
    expect(rows.slice(0, 5)).toEqual(EXPECTED_INTERFACE);
    expect(rows).toContain(OLD_SAVE);
    expect(rows).toContain(NEW_SAVE);
  });

  it("anchors each hunk on its own when the live file has unrelated local edits", () => {
    const rows = rendered(anchored(LOCALLY_EDITED), LOCALLY_EDITED);
    expect(rows.slice(0, 5)).toEqual(EXPECTED_INTERFACE);
    const added = rows.indexOf(NEW_SAVE);
    expect(rows.slice(added - 3, added + 1)).toEqual([
      " // @second-marker",
      " // @first-marker",
      OLD_SAVE,
      NEW_SAVE,
    ]);
  });

  it("moves highlights onto a patched file whose lines shifted", () => {
    const patched = anchored(BEFORE).afterSourceByPath.get(PATH)!;
    const shifted = `// new header\n// line two\n${patched}`;
    const rows = rendered(anchored(shifted), shifted);
    expect(rows.slice(2, 7)).toEqual(EXPECTED_INTERFACE);
    expect(rows.filter((row) => row.startsWith("+"))).toHaveLength(3);
  });

  it("leaves a file matching neither side untouched", () => {
    const overlay = anchored("unrelated\ntext");
    expect(overlay.afterSourceByPath.has(PATH)).toBe(false);
  });

  it("keeps CRLF line endings of the live file", () => {
    const live = BEFORE.replace(/\n/g, "\r\n");
    const source = anchored(live).afterSourceByPath.get(PATH)!;
    expect(source).toContain("string;\r\n  /** Added doc. */\r\n");
  });
});

describe("GraphSessionStore paste diff sources", () => {
  it("renders the anchored after-snapshot, not the stale live file", async () => {
    const client: AnalysisClient = {
      analyzeProject: async () => goldenGraph as unknown as ProjectGraph,
      readModuleSource: async () => BEFORE,
      searchModuleSources: async () => ({ matches: [], truncated: false }),
    };
    const store = testGraphSessionStore(client);
    await store.loadProject("/x");
    await store.applyDiffFromPaste(diffFor("src/core/store.ts"));
    expect(store.getSourceCache().get("src/core/store.ts")).toContain("  verbose: boolean;");
    store.clearDiffOverlay();
    expect(store.getSourceCache().has("src/core/store.ts")).toBe(false);
  });
});
