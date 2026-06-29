import { describe, expect, it } from "vitest";
import golden from "./fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../src/domain/graph";
import {
  applyDiffOverlay,
  compareGraphs,
  overlayFromPastedDiff,
  pathsFromUnifiedDiff,
  mergeCommitOverlay,
  lineDiffsFromUnified,
  countLineDiffStats,
} from "../src/domain/diff";

const base = golden as unknown as ProjectGraph;

describe("pathsFromUnifiedDiff", () => {
  it("classifies modified, added, and deleted paths", () => {
    const text = [
      "diff --git a/src/old.ts b/src/old.ts",
      "--- a/src/old.ts",
      "+++ b/src/old.ts",
      "@@ -1 +1 @@",
      "-x",
      "+y",
      "diff --git a/src/removed.ts b/src/removed.ts",
      "deleted file mode 100644",
      "--- a/src/removed.ts",
      "+++ /dev/null",
      "diff --git a/src/new.ts b/src/new.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/src/new.ts",
    ].join("\n");

    const paths = pathsFromUnifiedDiff(text);
    expect(paths.modified).toEqual(["src/old.ts"]);
    expect(paths.deleted).toEqual(["src/removed.ts"]);
    expect(paths.added).toEqual(["src/new.ts"]);
  });
});

describe("compareGraphs", () => {
  it("detects added edges and deleted modules", () => {
    const after: ProjectGraph = {
      ...base,
      modules: base.modules.filter((m) => m.id !== "src/core/validate.ts"),
      edges: [
        ...base.edges,
        {
          id: "src/main.ts->src/core/store.ts:import:99",
          source: "src/main.ts",
          target: "src/core/store.ts",
          kind: "import",
          trigger: "",
          isViolation: false,
        },
      ],
    };

    const diff = compareGraphs({ before: base, after });
    expect(diff.deletedModuleIds.has("src/core/validate.ts")).toBe(true);
    expect(diff.addedEdgeIds.has("src/main.ts->src/core/store.ts:import:99")).toBe(true);
    expect(diff.affectedModuleIds.has("src/main.ts")).toBe(false);
    expect(diff.affectedModuleIds.has("src/core/store.ts")).toBe(false);
  });

  it("does not mark edge endpoints when only edges change", () => {
    const edge = base.edges[0]!;
    const after: ProjectGraph = {
      ...base,
      edges: base.edges.filter((e) => e.id !== edge.id),
    };
    const diff = compareGraphs({ before: base, after });
    expect(diff.removedEdges).toHaveLength(1);
    expect(diff.affectedModuleIds.has(edge.source)).toBe(false);
    expect(diff.affectedModuleIds.has(edge.target)).toBe(false);
  });

  it("ignores export-only metadata changes on existing modules", () => {
    const target = base.modules[0]!;
    const after: ProjectGraph = {
      ...base,
      modules: base.modules.map((mod) =>
        mod.id === target.id
          ? { ...mod, exportedSymbols: [...mod.exportedSymbols, "extraSymbol"] }
          : mod,
      ),
    };

    const diff = compareGraphs({ before: base, after });
    expect(diff.affectedModuleIds.has(target.id)).toBe(false);
  });
});

describe("mergeCommitOverlay", () => {
  it("uses git paths for file-level module changes", () => {
    const text = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
    ].join("\n");
    const pathOverlay = overlayFromPastedDiff(text, base);
    const graphOverlay = compareGraphs({ before: base, after: base });
    const merged = mergeCommitOverlay(pathOverlay, graphOverlay, base);
    expect(merged.affectedModuleIds.has("src/core/store.ts")).toBe(true);
  });
});

describe("overlayFromPastedDiff", () => {
  it("maps diff paths to module ids in the current graph", () => {
    const text = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
    ].join("\n");
    const overlay = overlayFromPastedDiff(text, base);
    expect(overlay.affectedModuleIds.has("src/core/store.ts")).toBe(true);
    expect(overlay.addedEdgeIds.size).toBe(0);
  });
});

describe("applyDiffOverlay", () => {
  it("stamps diffVisualizing on group nodes", () => {
    const projected = {
      nodes: [
        {
          id: "core",
          type: "group" as const,
          position: { x: 0, y: 0 },
          data: { label: "Core", color: "#2563eb" },
        },
      ],
      edges: [],
    };
    const overlay = overlayFromPastedDiff("", base);
    const stamped = applyDiffOverlay(projected, overlay);
    expect(stamped.nodes[0]?.data.diffVisualizing).toBe(true);
  });
});

describe("countLineDiffStats", () => {
  it("counts added and removed lines from a parsed file diff", () => {
    const text = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "@@ -1,3 +1,4 @@",
      " keep",
      "-old",
      "+new1",
      "+new2",
    ].join("\n");
    const diffs = lineDiffsFromUnified(text);
    const stats = countLineDiffStats(diffs.get("src/foo.ts")!);
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(1);
  });
});
