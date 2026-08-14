import { describe, expect, it } from "vitest";
import golden from "./fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../src/domain/graph";
import {
  applyDiffOverlay,
  compareGraphs,
  overlayFromPastedDiff,
  pathsFromUnifiedDiff,
  normalizeDiffPath,
  mergeCommitOverlay,
  lineDiffsFromUnified,
  countLineDiffStats,
} from "../src/domain/diff";

const base = golden as unknown as ProjectGraph;

describe("normalizeDiffPath", () => {
  it("strips a/ and b/ prefixes, quotes, and backslashes", () => {
    expect(normalizeDiffPath("a/src/foo.ts")).toBe("src/foo.ts");
    expect(normalizeDiffPath("b/src/foo.ts")).toBe("src/foo.ts");
    expect(normalizeDiffPath('"src/foo.ts"')).toBe("src/foo.ts");
    expect(normalizeDiffPath("src\\foo.ts")).toBe("src/foo.ts");
  });
});

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

  it("classifies renames as deleted plus added", () => {
    const text = [
      "diff --git a/src/old-name.ts b/src/new-name.ts",
      "--- a/src/old-name.ts",
      "+++ b/src/new-name.ts",
    ].join("\n");

    const paths = pathsFromUnifiedDiff(text);
    expect(paths.modified).toEqual([]);
    expect(paths.deleted).toEqual(["src/old-name.ts"]);
    expect(paths.added).toEqual(["src/new-name.ts"]);
    expect(paths.renames).toEqual([{ from: "src/old-name.ts", to: "src/new-name.ts" }]);
  });

  it("ignores malformed diff --git lines without a/ b/ paths", () => {
    const text = ["diff --git foo bar", "--- a/x.ts", "+++ b/x.ts"].join("\n");
    const paths = pathsFromUnifiedDiff(text);
    expect(paths.modified).toEqual(["x.ts"]);
  });

  it("handles CRLF line endings", () => {
    const text = "diff --git a/a.ts b/a.ts\r\n--- a/a.ts\r\n+++ b/a.ts\r\n";
    expect(pathsFromUnifiedDiff(text).modified).toEqual(["a.ts"]);
  });

  it("handles deleted file mode without --- / +++ (e.g. binary patches)", () => {
    const text = [
      "diff --git a/public/assets/ui/lobby/old.png b/public/assets/ui/lobby/old.png",
      "deleted file mode 100644",
      "index e6d1822..0000000",
      "GIT binary patch",
      "literal 0",
      "HcmV?d00001",
    ].join("\n");
    const paths = pathsFromUnifiedDiff(text);
    expect(paths.deleted).toEqual(["public/assets/ui/lobby/old.png"]);
    expect(paths.modified).toEqual([]);
  });

  it("handles new file mode without --- / +++ (e.g. binary patches)", () => {
    const text = [
      "diff --git a/public/assets/ui/lobby/new.png b/public/assets/ui/lobby/new.png",
      "new file mode 100644",
      "index 0000000..e6d1822",
      "GIT binary patch",
    ].join("\n");
    const paths = pathsFromUnifiedDiff(text);
    expect(paths.added).toEqual(["public/assets/ui/lobby/new.png"]);
    expect(paths.modified).toEqual([]);
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

  it("renders deleted files as ghost nodes with diffState deleted (red border)", () => {
    const text = [
      "diff --git a/src/core/deleted-helper.ts b/src/core/deleted-helper.ts",
      "deleted file mode 100644",
      "--- a/src/core/deleted-helper.ts",
      "+++ /dev/null",
      "@@ -1,3 +0,0 @@",
      "-const helper = 1;",
    ].join("\n");
    const partial = overlayFromPastedDiff(text, base);
    expect(partial.deletedModuleIds.has("src/core/deleted-helper.ts")).toBe(true);
    expect(partial.ghostModules.some((m) => m.id === "src/core/deleted-helper.ts")).toBe(true);

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
    const overlay = {
      ...partial,
      beforeLayout: null,
      unifiedDiff: text,
      lineDiffByPath: new Map(),
      afterSourceByPath: new Map(),
    };
    const stamped = applyDiffOverlay(projected, overlay);
    const deletedNode = stamped.nodes.find((n) => n.id === "src/core/deleted-helper.ts");
    expect(deletedNode).toBeDefined();
    expect(deletedNode?.data.diffState).toBe("deleted");
  });

  it("infers language on ghost modules for deleted files across supported extensions", () => {
    const text = [
      "diff --git a/src/lib.rs b/src/lib.rs\ndeleted file mode 100644\n--- a/src/lib.rs\n+++ /dev/null",
      "diff --git a/src/util.cpp b/src/util.cpp\ndeleted file mode 100644\n--- a/src/util.cpp\n+++ /dev/null",
      "diff --git a/src/app.tsx b/src/app.tsx\ndeleted file mode 100644\n--- a/src/app.tsx\n+++ /dev/null",
      "diff --git a/src/styles.css b/src/styles.css\ndeleted file mode 100644\n--- a/src/styles.css\n+++ /dev/null",
      "diff --git a/src/game.cs b/src/game.cs\ndeleted file mode 100644\n--- a/src/game.cs\n+++ /dev/null",
      "diff --git a/src/Player.prefab b/src/Player.prefab\ndeleted file mode 100644\n--- a/src/Player.prefab\n+++ /dev/null",
    ].join("\n");
    const partial = overlayFromPastedDiff(text, base);
    const ghostByPath = new Map(partial.ghostModules.map((m) => [m.path, m.language]));
    expect(ghostByPath.get("src/lib.rs")).toBe("rust");
    expect(ghostByPath.get("src/util.cpp")).toBe("cpp");
    expect(ghostByPath.get("src/app.tsx")).toBe("tsx");
    expect(ghostByPath.get("src/styles.css")).toBe("css");
    expect(ghostByPath.get("src/game.cs")).toBe("csharp");
    expect(ghostByPath.get("src/Player.prefab")).toBe("unityPrefab");
  });

  it("positions multiple deleted files without stacking them on top of each other", () => {
    const text = [
      "diff --git a/src/core/deleted-one.ts b/src/core/deleted-one.ts",
      "deleted file mode 100644",
      "--- a/src/core/deleted-one.ts",
      "+++ /dev/null",
      "diff --git a/src/core/deleted-two.ts b/src/core/deleted-two.ts",
      "deleted file mode 100644",
      "--- a/src/core/deleted-two.ts",
      "+++ /dev/null",
    ].join("\n");
    const partial = overlayFromPastedDiff(text, base);
    const projected = {
      nodes: [
        {
          id: "core",
          type: "group" as const,
          position: { x: 0, y: 0 },
          width: 500,
          height: 400,
          data: { label: "Core", color: "#2563eb" },
        },
        {
          id: "src/core/store.ts",
          type: "module" as const,
          parentId: "core",
          position: { x: 20, y: 40 },
          width: 120,
          height: 90,
          data: { label: "store.ts", isFacade: false, language: "typescript" as const, diffState: "affected" as const },
        },
      ],
      edges: [],
    };
    const overlay = {
      ...partial,
      beforeLayout: null,
      unifiedDiff: text,
      lineDiffByPath: new Map(),
      afterSourceByPath: new Map(),
    };
    const stamped = applyDiffOverlay(projected, overlay);
    const ghost1 = stamped.nodes.find((n) => n.id === "src/core/deleted-one.ts");
    const ghost2 = stamped.nodes.find((n) => n.id === "src/core/deleted-two.ts");
    expect(ghost1).toBeDefined();
    expect(ghost2).toBeDefined();
    expect(ghost1?.position).not.toEqual(ghost2?.position);

    // Ensure ghost nodes do not overlap the affected module at (20, 40)
    const overlap = (r1: { x: number; y: number; width?: number; height?: number }, r2: { x: number; y: number; width?: number; height?: number }) => {
      const w1 = r1.width ?? 120;
      const h1 = r1.height ?? 90;
      const w2 = r2.width ?? 120;
      const h2 = r2.height ?? 90;
      return Math.max(0, Math.min(r1.x + w1, r2.x + w2) - Math.max(r1.x, r2.x)) *
             Math.max(0, Math.min(r1.y + h1, r2.y + h2) - Math.max(r1.y, r2.y));
    };

    expect(overlap(ghost1!.position, ghost2!.position)).toBe(0);
    expect(overlap(ghost1!.position, { x: 20, y: 40 })).toBe(0);
    expect(overlap(ghost2!.position, { x: 20, y: 40 })).toBe(0);
  });

  it("prioritizes avoiding overlap with diff modules over unchanged modules in tight space", () => {
    const text = [
      "diff --git a/src/core/deleted-one.ts b/src/core/deleted-one.ts",
      "deleted file mode 100644",
      "--- a/src/core/deleted-one.ts",
      "+++ /dev/null",
    ].join("\n");
    const partial = overlayFromPastedDiff(text, base);
    const projected = {
      nodes: [
        {
          id: "core",
          type: "group" as const,
          position: { x: 0, y: 0 },
          width: 250,
          height: 180,
          data: { label: "Core", color: "#2563eb" },
        },
        {
          id: "src/core/unchanged.ts",
          type: "module" as const,
          parentId: "core",
          position: { x: 20, y: 40 },
          width: 100,
          height: 80,
          data: { label: "unchanged.ts", isFacade: false, language: "typescript" as const, diffState: "unchanged" as const },
        },
        {
          id: "src/core/affected.ts",
          type: "module" as const,
          parentId: "core",
          position: { x: 130, y: 40 },
          width: 100,
          height: 80,
          data: { label: "affected.ts", isFacade: false, language: "typescript" as const, diffState: "affected" as const },
        },
      ],
      edges: [],
    };
    const overlay = {
      ...partial,
      beforeLayout: null,
      unifiedDiff: text,
      lineDiffByPath: new Map(),
      afterSourceByPath: new Map(),
    };
    const stamped = applyDiffOverlay(projected, overlay);
    const ghost = stamped.nodes.find((n) => n.id === "src/core/deleted-one.ts")!;
    expect(ghost).toBeDefined();

    const overlap = (r1: { x: number; y: number; width?: number; height?: number }, r2: { x: number; y: number; width?: number; height?: number }) => {
      const w1 = r1.width ?? 120;
      const h1 = r1.height ?? 90;
      const w2 = r2.width ?? 100;
      const h2 = r2.height ?? 80;
      return Math.max(0, Math.min(r1.x + w1, r2.x + w2) - Math.max(r1.x, r2.x)) *
             Math.max(0, Math.min(r1.y + h1, r2.y + h2) - Math.max(r1.y, r2.y));
    };

    const affectedOverlap = overlap(ghost.position, { x: 130, y: 40 });
    const unchangedOverlap = overlap(ghost.position, { x: 20, y: 40 });
    // Overlap with diff/affected module should be less than or equal to unchanged module (preferably 0)
    expect(affectedOverlap).toBeLessThanOrEqual(unchangedOverlap);
  });

  it("places root-level ghost modules when no group exists without overlapping", () => {
    const text = [
      "diff --git a/standalone1.ts b/standalone1.ts",
      "deleted file mode 100644",
      "--- a/standalone1.ts",
      "+++ /dev/null",
      "diff --git a/standalone2.ts b/standalone2.ts",
      "deleted file mode 100644",
      "--- a/standalone2.ts",
      "+++ /dev/null",
    ].join("\n");
    const partial = overlayFromPastedDiff(text, base);
    const projected = { nodes: [], edges: [] };
    const overlay = {
      ...partial,
      beforeLayout: null,
      unifiedDiff: text,
      lineDiffByPath: new Map(),
      afterSourceByPath: new Map(),
    };
    const stamped = applyDiffOverlay(projected, overlay);
    const ghost1 = stamped.nodes.find((n) => n.id === "standalone1.ts");
    const ghost2 = stamped.nodes.find((n) => n.id === "standalone2.ts");
    expect(ghost1).toBeDefined();
    expect(ghost2).toBeDefined();
    expect(ghost1?.position).not.toEqual(ghost2?.position);
  });

  it("stamps added and removed diffState on edges and injects phantom edges", () => {
    const projected = {
      nodes: [
        {
          id: "src/core/store.ts",
          type: "module" as const,
          position: { x: 0, y: 0 },
          data: { label: "store.ts", isFacade: false, language: "typescript" as const },
        },
        {
          id: "src/core/validate.ts",
          type: "module" as const,
          position: { x: 100, y: 100 },
          data: { label: "validate.ts", isFacade: false, language: "typescript" as const },
        },
      ],
      edges: [
        {
          id: "src/core/store.ts->src/core/validate.ts:import:0",
          source: "src/core/store.ts",
          target: "src/core/validate.ts",
          type: "default",
          data: { isViolation: false, kind: "import" as const },
        },
      ],
    };

    const overlay = {
      affectedModuleIds: new Set(["src/core/store.ts"]),
      deletedModuleIds: new Set(["src/core/validate.ts"]),
      addedSymbolIds: new Set<string>(),
      removedSymbolIds: new Set<string>(),
      modifiedSymbolIds: new Set<string>(),
      addedEdgeIds: new Set(["src/core/store.ts->src/core/new.ts:import:diff"]),
      addedEdges: [
        {
          id: "src/core/store.ts->src/core/new.ts:import:diff",
          source: "src/core/store.ts",
          target: "src/core/new.ts",
          kind: "import" as const,
          trigger: "import",
          isViolation: false,
        },
      ],
      removedEdges: [
        {
          id: "src/core/store.ts->src/core/validate.ts:import:0",
          source: "src/core/store.ts",
          target: "src/core/validate.ts",
          kind: "import" as const,
          trigger: "import",
          isViolation: false,
        },
      ],
      ghostModules: [],
      beforeLayout: null,
      unifiedDiff: "",
      lineDiffByPath: new Map(),
      afterSourceByPath: new Map(),
    };

    const stamped = applyDiffOverlay(projected, overlay);
    const existingEdge = stamped.edges.find(
      (e) => e.source === "src/core/store.ts" && e.target === "src/core/validate.ts",
    );
    expect(existingEdge?.data?.diffState).toBe("removed");

    const addedEdge = stamped.edges.find((e) => e.target === "src/core/new.ts");
    expect(addedEdge).toBeDefined();
    expect(addedEdge?.data?.diffState).toBe("added");
  });

  it("extracts added and removed import edges in overlayFromPastedDiff", () => {
    const text = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,4 +1,5 @@",
      "-import { validate } from './validate';",
      "+import { api } from '../services/api';",
    ].join("\n");

    const overlay = overlayFromPastedDiff(text, base);
    expect(overlay.removedEdges.some((e) => e.target.includes("validate"))).toBe(true);
    expect(overlay.addedEdges?.some((e) => e.target.includes("api"))).toBe(true);
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
