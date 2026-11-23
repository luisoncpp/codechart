/**
 * LLM patches get hunk bodies right but `@@` numbers wrong. Paste mode must place the rows
 * where the hunk's content lands in the live file, not where the header claims.
 */
import { describe, expect, it } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { buildModuleDiffDisplay } from "../src/domain/diff";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { ProjectGraph } from "../src/domain/graph";

const PATH = "src/core/store.ts";

// Live (patched) file: the function starts at line 9, not where the header claims (line 2).
const LIVE = [
  "// 1", "// 2", "// 3", "// 4", "// 5", "// 6", "// 7",
  "",
  "bool U::CanAttemptJump() const",
  "{",
  "\tif (!Super::CanAttemptJump())",
  "\t{",
  "\t\treturn false;",
  "\t}",
  "\treturn true;",
  "}",
].join("\n");

const STALE_DIFF = [
  `--- a/${PATH}`,
  `+++ b/${PATH}`,
  "@@ -2,6 +2,9 @@",
  "",
  " bool U::CanAttemptJump() const",
  " {",
  "-\tbool bSuper = Super::CanAttemptJump();",
  "+\tif (!Super::CanAttemptJump())",
  "+\t{",
  "+\t\treturn false;",
  "+\t}",
  "-\treturn bSuper;",
  "+\treturn true;",
  " }",
].join("\n");

describe("pasted diff with a stale hunk header", () => {
  it("paints the added rows on the live lines that hold their text", async () => {
    const client: AnalysisClient = {
      analyzeProject: async () => goldenGraph as unknown as ProjectGraph,
      readModuleSource: async (_root, path) => (path === PATH ? LIVE : ""),
      searchModuleSources: async () => ({ matches: [], truncated: false }),
    };
    const store = testGraphSessionStore(client);
    await store.loadProject("/x");
    await store.applyDiffFromPaste(STALE_DIFF);
    const lineDiff = store.getDiffOverlay()?.lineDiffByPath.get(PATH);
    expect([...(lineDiff?.addedLineNumbers ?? [])]).toEqual([11, 12, 13, 14, 15]);
    const source = store.getSourceCache().get(PATH) ?? LIVE;
    const rows = buildModuleDiffDisplay(source, lineDiff);
    const removed = rows.filter((row) => row.kind === "remove").map((row) => row.text);
    expect(removed).toEqual(["\tbool bSuper = Super::CanAttemptJump();", "\treturn bSuper;"]);
  });
});
