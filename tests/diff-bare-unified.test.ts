import { describe, expect, it } from "vitest";
import golden from "./fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../src/domain/graph";
import {
  lineDiffsFromUnified,
  overlayFromPastedDiff,
  parseDiffNotes,
  pathsFromUnifiedDiff,
} from "../src/domain/diff";

const base = golden as unknown as ProjectGraph;

/**
 * A "bare" unified diff has no git extended headers (`diff --git`, `new file mode`),
 * only `---` / `+++` pairs — what `diff -u` and most LLM-generated patches emit.
 * Without a per-file separator every section must still be flushed on its own.
 */
const BareDiff = [
  "--- a/src/core/store.ts",
  "+++ b/src/core/store.ts",
  "@@ -1,3 +1,4 @@",
  ' import { Todo } from "./todo";',
  '+import { validate } from "./validate";',
  " ",
  "--- /dev/null",
  "+++ b/src/services/retry.ts",
  "@@ -0,0 +1,2 @@",
  '+import { http } from "./http";',
  "+export const retry = () => {};",
  "--- a/src/core/validate.ts",
  "+++ /dev/null",
  "@@ -1,2 +0,0 @@",
  '-import { Todo } from "./todo";',
  "-export const validate = () => {};",
].join("\n");

describe("pathsFromUnifiedDiff without diff --git headers", () => {
  it("classifies every file section, not only the last one", () => {
    const paths = pathsFromUnifiedDiff(BareDiff);
    expect(paths.modified).toEqual(["src/core/store.ts"]);
    expect(paths.added).toEqual(["src/services/retry.ts"]);
    expect(paths.deleted).toEqual(["src/core/validate.ts"]);
    expect(paths.renames).toEqual([]);
  });

  it("keeps a bare rename a rename", () => {
    const text = ["--- a/src/core/todo.ts", "+++ b/src/core/task.ts"].join("\n");
    const paths = pathsFromUnifiedDiff(text);
    expect(paths.renames).toEqual([{ from: "src/core/todo.ts", to: "src/core/task.ts" }]);
  });
});

describe("overlayFromPastedDiff without diff --git headers", () => {
  it("marks every touched module", () => {
    const overlay = overlayFromPastedDiff(BareDiff, base);
    expect(overlay.affectedModuleIds.has("src/core/store.ts")).toBe(true);
    expect(overlay.affectedModuleIds.has("src/core/validate.ts")).toBe(true);
    expect(overlay.deletedModuleIds.has("src/core/validate.ts")).toBe(true);
  });

  it("infers added import edges from the after-path", () => {
    const overlay = overlayFromPastedDiff(BareDiff, base);
    expect(
      overlay.addedEdges?.some(
        (e) => e.source === "src/core/store.ts" && e.target === "src/core/validate.ts",
      ),
    ).toBe(true);
  });

  it("attributes a deleted file's removed imports to its before-path", () => {
    const overlay = overlayFromPastedDiff(BareDiff, base);
    expect(
      overlay.removedEdges.some(
        (e) => e.source === "src/core/validate.ts" && e.target === "src/core/todo.ts",
      ),
    ).toBe(true);
  });
});

describe("lineDiffsFromUnified without diff --git headers", () => {
  it("maps line diffs for every file section", () => {
    const byPath = lineDiffsFromUnified(BareDiff);
    expect([...byPath.keys()].sort()).toEqual([
      "src/core/store.ts",
      "src/core/validate.ts",
      "src/services/retry.ts",
    ]);
  });

  /**
   * `--- /dev/null` opens the *next* section while the previous one is still `inHunk`.
   * Read as content it becomes a removed `-- /dev/null` row on the wrong file.
   */
  it("never records a header as a removed line", () => {
    for (const diff of lineDiffsFromUnified(BareDiff).values()) {
      const texts = diff.removedLineDetails.map((d) => d.text);
      expect(texts.some((t) => t.includes("/dev/null"))).toBe(false);
    }
  });

  it("keeps a removed line whose content looks like a header", () => {
    const text = [
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,2 +1,1 @@",
      "--- a comment that is not a header",
      " kept",
    ].join("\n");
    const diff = lineDiffsFromUnified(text).get("src/core/store.ts");
    expect(diff?.removedLineDetails.map((d) => d.text)).toEqual([
      "-- a comment that is not a header",
    ]);
  });
});

describe("parseDiffNotes without diff --git headers", () => {
  it("binds a Diff Note to the section it was written in", () => {
    const text = [
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,1 +1,2 @@",
      '+import { validate } from "./validate";',
      "# why the import moved here",
      "--- /dev/null",
      "+++ b/src/services/retry.ts",
      "@@ -0,0 +1,1 @@",
      "+export const retry = () => {};",
    ].join("\n");
    const { notes, droppedMarkerText } = parseDiffNotes(text);
    expect(droppedMarkerText).toBe("");
    expect(notes).toHaveLength(1);
    expect(notes[0]?.path).toBe("src/core/store.ts");
    expect(notes[0]?.body).toBe("why the import moved here");
  });
});
