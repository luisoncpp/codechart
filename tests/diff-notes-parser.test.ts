import { describe, expect, it } from "vitest";
import {
  lineDiffsFromUnified,
  parseDiffNotes,
  pathsFromUnifiedDiff,
} from "../src/domain/diff";

describe("parseDiffNotes", () => {
  it("binds note after an added run to after-side line numbers", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,5 @@",
      " context 1",
      "+add 1",
      "+add 2",
      "# Explaining the added lines",
      " context 2",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.droppedMarkerText).toBe("");
    expect(result.notes).toEqual([
      {
        path: "src/a.ts",
        startLine: 2,
        endLine: 3,
        side: "after",
        body: "Explaining the added lines",
      },
    ]);
  });

  it("binds note after a removed run to before-side line numbers", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,5 +1,3 @@",
      " context 1",
      "-remove 1",
      "-remove 2",
      "# Explaining the removed lines",
      " context 2",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.droppedMarkerText).toBe("");
    expect(result.notes).toEqual([
      {
        path: "src/a.ts",
        startLine: 2,
        endLine: 3,
        side: "before",
        body: "Explaining the removed lines",
      },
    ]);
  });

  it("binds note after a context run to after-side line numbers", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,3 @@",
      " context 1",
      " context 2",
      "# Explaining context lines",
      "+add 1",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.droppedMarkerText).toBe("");
    expect(result.notes).toEqual([
      {
        path: "src/a.ts",
        startLine: 1,
        endLine: 2,
        side: "after",
        body: "Explaining context lines",
      },
    ]);
  });

  it("splits replace (- then +) into two notes if both are annotated", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,3 @@",
      "-old line",
      "# Reason for removal",
      "+new line",
      "# Reason for addition",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.droppedMarkerText).toBe("");
    expect(result.notes).toHaveLength(2);
    expect(result.notes[0]).toEqual({
      path: "src/a.ts",
      startLine: 1,
      endLine: 1,
      side: "before",
      body: "Reason for removal",
    });
    expect(result.notes[1]).toEqual({
      path: "src/a.ts",
      startLine: 1,
      endLine: 1,
      side: "after",
      body: "Reason for addition",
    });
  });

  it("drops stacked second marker runs without intervening hunk body", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,2 +1,2 @@",
      "+add 1",
      "# First note",
      "\\ No newline at end of file",
      "# Second unbound note",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]!.body).toBe("First note");
    expect(result.droppedMarkerText).toBe("# Second unbound note");
  });

  it("drops markers before the first hunk or between files", () => {
    const text = [
      "# Leading unbound marker",
      "diff --git a/src/a.ts b/src/a.ts",
      "# Marker between file header and hunk",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,1 +1,1 @@",
      "+line",
      "# Valid note",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]!.body).toBe("Valid note");
    expect(result.droppedMarkerText).toBe(
      "# Leading unbound marker\n# Marker between file header and hunk",
    );
  });

  it("treats +# and  # as hunk body code comments, not markers", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,2 +1,3 @@",
      " # existing comment",
      "+# added comment",
      "# Note on the added comment",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.droppedMarkerText).toBe("");
    expect(result.notes).toEqual([
      {
        path: "src/a.ts",
        startLine: 2,
        endLine: 2,
        side: "after",
        body: "Note on the added comment",
      },
    ]);
  });

  it("drops blank or whitespace-only marker bodies into droppedMarkerText", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,1 +1,2 @@",
      " context",
      "+added line",
      "#",
      "#    ",
    ].join("\n");

    const result = parseDiffNotes(text);
    expect(result.notes).toHaveLength(0);
    expect(result.droppedMarkerText).toBe("#\n#    ");
  });

  it("handles CRLF line endings identically", () => {
    const text = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,2 +1,3 @@",
      " context 1",
      "+added line",
      "# Note with CRLF",
    ].join("\r\n");

    const result = parseDiffNotes(text);
    expect(result.droppedMarkerText).toBe("");
    expect(result.notes).toEqual([
      {
        path: "src/a.ts",
        startLine: 2,
        endLine: 2,
        side: "after",
        body: "Note with CRLF",
      },
    ]);
  });
});

describe("lineDiffsFromUnified and pathsFromUnifiedDiff with markers", () => {
  it("computes identical line numbers and paths whether markers are present or not", () => {
    const rawPatch = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,3 @@",
      " keep",
      "-old",
      "+new",
    ].join("\n");

    const annotatedPatch = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,3 +1,3 @@",
      " keep",
      "-old",
      "# explain removal",
      "+new",
      "# explain addition",
    ].join("\n");

    const rawDiffs = lineDiffsFromUnified(rawPatch);
    const annotatedDiffs = lineDiffsFromUnified(annotatedPatch);

    const rawA = rawDiffs.get("src/a.ts")!;
    const annotatedA = annotatedDiffs.get("src/a.ts")!;

    expect([...annotatedA.addedLineNumbers]).toEqual([...rawA.addedLineNumbers]);
    expect([...(annotatedA.removedLineNumbers ?? [])]).toEqual([
      ...(rawA.removedLineNumbers ?? []),
    ]);
    expect(annotatedA.removeBeforeLine.get(2)).toEqual(rawA.removeBeforeLine.get(2));

    expect(pathsFromUnifiedDiff(annotatedPatch)).toEqual(pathsFromUnifiedDiff(rawPatch));
  });

  it("parses user example snippet correctly", () => {
    const snippet = [
      "# [Dropped Marker Test] This marker is before the first hunk so it will be dropped and trigger the warning panel!",
      "diff --git a/src/features/diff_visualizer/index.ts b/src/features/diff_visualizer/index.ts",
      "--- a/src/features/diff_visualizer/index.ts",
      "+++ b/src/features/diff_visualizer/index.ts",
      "@@ -1,5 +1,7 @@",
      " export { DiffModal } from \"./Private/DiffModal\";",
      " export { DiffOverlayBar } from \"./Private/DiffOverlayBar\";",
      "+export { DiffNotesList } from \"./Private/DiffNoteNotice\";",
      "# **New Export:** Exposes `DiffNotesList` for inline source view rendering in L2 and preview frames.",
      "+export { DroppedMarkersWarning } from \"./Private/DroppedMarkersWarning\";",
      "# **Warning Component:** Exposes the floating banner for unbound `#` markers.",
      " ",
      "diff --git a/src/domain/diff/index.ts b/src/domain/diff/index.ts",
      "--- a/src/domain/diff/index.ts",
      "+++ b/src/domain/diff/index.ts",
      "@@ -1,4 +1,4 @@",
      "-export type { GraphDiffOverlay, DiffNote, DiffNoteSide, DiffNoteParseResult } from \"./Private/types\";",
      "# **Refactored Type Exports:** Removed internal-only types `DiffNoteSide` and `DiffNoteParseResult`.",
      "+export type { GraphDiffOverlay, DiffNote } from \"./Private/types\";",
      " export type { FileLineDiff, DiffDisplayRow } from \"./Private/line-diff-types\";",
      " export { UNCHANGED_MODULE_DIFF_OPACITY } from \"./Private/line-diff-types\";",
    ].join("\n");

    const result = parseDiffNotes(snippet);
    expect(result.droppedMarkerText).toBe(
      "# [Dropped Marker Test] This marker is before the first hunk so it will be dropped and trigger the warning panel!",
    );
    expect(result.notes).toHaveLength(3);
    expect(result.notes[0]).toEqual({
      path: "src/features/diff_visualizer/index.ts",
      startLine: 3,
      endLine: 3,
      side: "after",
      body: "**New Export:** Exposes `DiffNotesList` for inline source view rendering in L2 and preview frames.",
    });
    expect(result.notes[1]).toEqual({
      path: "src/features/diff_visualizer/index.ts",
      startLine: 4,
      endLine: 4,
      side: "after",
      body: "**Warning Component:** Exposes the floating banner for unbound `#` markers.",
    });
    expect(result.notes[2]).toEqual({
      path: "src/domain/diff/index.ts",
      startLine: 1,
      endLine: 1,
      side: "before",
      body: "**Refactored Type Exports:** Removed internal-only types `DiffNoteSide` and `DiffNoteParseResult`.",
    });
  });
});

