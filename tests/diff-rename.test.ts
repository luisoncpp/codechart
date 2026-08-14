import { describe, expect, it } from "vitest";
import {
  applyDiffOverlay,
  attachLineDiff,
  attachRenames,
  overlayFromPastedDiff,
  pathsFromUnifiedDiff,
} from "../src/domain/diff";
import { styleEdge } from "../src/features/graph_canvas";
import type { GraphDiffOverlay } from "../src/domain/diff";
import type { ProjectGraph } from "../src/domain/graph";

const emptySets = {
  addedSymbolIds: new Set<string>(),
  removedSymbolIds: new Set<string>(),
  modifiedSymbolIds: new Set<string>(),
  addedEdgeIds: new Set<string>(),
  addedEdges: [] as GraphDiffOverlay["addedEdges"],
  removedEdges: [] as GraphDiffOverlay["removedEdges"],
  ghostModules: [] as GraphDiffOverlay["ghostModules"],
};

function overlayFromDiff(text: string, extra: Partial<GraphDiffOverlay> = {}): GraphDiffOverlay {
  const paths = pathsFromUnifiedDiff(text);
  return attachLineDiff({
    affectedModuleIds: new Set(paths.added),
    deletedModuleIds: new Set(paths.deleted),
    ...emptySets,
    renamePairs: paths.renames,
    beforeLayout: null,
    ...extra,
  }, text);
}

const GIT_RENAME_DIFF = [
  "diff --git a/src/old.ts b/src/new.ts",
  "similarity index 80%",
  "rename from src/old.ts",
  "rename to src/new.ts",
  "--- a/src/old.ts",
  "+++ b/src/new.ts",
].join("\n");

const SIMILAR_BODY_DIFF = [
  "diff --git a/src/old-util.ts b/src/old-util.ts",
  "deleted file mode 100644",
  "--- a/src/old-util.ts",
  "+++ /dev/null",
  "@@ -1,3 +0,0 @@",
  "-export function helper() {",
  "-  return 1;",
  "-}",
  "diff --git a/src/new-util.ts b/src/new-util.ts",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/src/new-util.ts",
  "@@ -0,0 +1,4 @@",
  "+export function helper() {",
  "+  return 1;",
  "+}",
  "+export const extra = true;",
].join("\n");

const BASENAME_MOVE_DIFF = [
  "diff --git a/src/a/Util.ts b/src/a/Util.ts",
  "deleted file mode 100644",
  "--- a/src/a/Util.ts",
  "+++ /dev/null",
  "@@ -1,2 +0,0 @@",
  "-const alpha = 1;",
  "-const beta = 2;",
  "diff --git a/src/b/Util.ts b/src/b/Util.ts",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/src/b/Util.ts",
  "@@ -0,0 +1,2 @@",
  "+const gamma = 3;",
  "+const delta = 4;",
].join("\n");

const UNRELATED_DIFF = [
  "diff --git a/src/gone.ts b/src/gone.ts",
  "deleted file mode 100644",
  "--- a/src/gone.ts",
  "+++ /dev/null",
  "@@ -1 +0,0 @@",
  "-export const gone = true;",
  "diff --git a/src/fresh.ts b/src/fresh.ts",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/src/fresh.ts",
  "@@ -0,0 +1 @@",
  "+export const fresh = 1;",
].join("\n");

describe("pathsFromUnifiedDiff renames", () => {
  it("records a git rename header as deleted plus added plus a pair", () => {
    const text = [
      "diff --git a/src/old-name.ts b/src/new-name.ts",
      "similarity index 72%",
      "rename from src/old-name.ts",
      "rename to src/new-name.ts",
      "--- a/src/old-name.ts",
      "+++ b/src/new-name.ts",
    ].join("\n");
    const paths = pathsFromUnifiedDiff(text);
    expect(paths.deleted).toEqual(["src/old-name.ts"]);
    expect(paths.added).toEqual(["src/new-name.ts"]);
    expect(paths.renames).toEqual([{ from: "src/old-name.ts", to: "src/new-name.ts" }]);
  });

  it("does not treat copies as renames or deletes", () => {
    const text = [
      "diff --git a/src/old.ts b/src/copy.ts",
      "similarity index 95%",
      "copy from src/old.ts",
      "copy to src/copy.ts",
      "--- a/src/old.ts",
      "+++ b/src/copy.ts",
    ].join("\n");
    const paths = pathsFromUnifiedDiff(text);
    expect(paths.deleted).toEqual([]);
    expect(paths.added).toEqual(["src/copy.ts"]);
    expect(paths.renames).toEqual([]);
  });
});

describe("attachRenames git headers", () => {
  it("keeps git header pairs without needing content", () => {
    const overlay = attachRenames({ overlay: overlayFromDiff(GIT_RENAME_DIFF) });
    expect(overlay.renamePairs).toEqual([{ from: "src/old.ts", to: "src/new.ts" }]);
  });
});

describe("attachRenames fingerprint fallback", () => {
  it("pairs unpaired delete+add files with similar reconstructed bodies", () => {
    const overlay = attachRenames({ overlay: overlayFromDiff(SIMILAR_BODY_DIFF) });
    expect(overlay.renamePairs).toEqual([{ from: "src/old-util.ts", to: "src/new-util.ts" }]);
  });

  it("pairs a unique basename move even when the body changed a lot", () => {
    const overlay = attachRenames({ overlay: overlayFromDiff(BASENAME_MOVE_DIFF) });
    expect(overlay.renamePairs).toEqual([{ from: "src/a/Util.ts", to: "src/b/Util.ts" }]);
  });

  it("does not pair unrelated delete+add files", () => {
    const overlay = attachRenames({ overlay: overlayFromDiff(UNRELATED_DIFF) });
    expect(overlay.renamePairs).toEqual([]);
  });

  it("matches 1:1 — two similar deletes pick only the better added file", () => {
    const overlay = attachRenames({
      overlay: overlayFromDiff("", {
        affectedModuleIds: new Set(["src/kept.ts"]),
        deletedModuleIds: new Set(["src/left.ts", "src/right.ts"]),
        renamePairs: [],
      }),
      beforeSources: new Map([
        ["src/left.ts", "shared\nleft-only\n"],
        ["src/right.ts", "shared\nleft-only\nright-extra\n"],
      ]),
      afterSources: new Map([["src/kept.ts", "shared\nleft-only\nextra\n"]]),
      beforeModules: [module("src/left.ts"), module("src/right.ts")],
      afterModules: [module("src/kept.ts")],
    });
    expect(overlay.renamePairs).toEqual([{ from: "src/left.ts", to: "src/kept.ts" }]);
  });

  it("does not match different extensions", () => {
    const overlay = attachRenames({
      overlay: overlayFromDiff("", {
        affectedModuleIds: new Set(["src/photo.png"]),
        deletedModuleIds: new Set(["src/photo.ts"]),
        renamePairs: [],
      }),
      beforeSources: new Map([["src/photo.ts", "same line\n"]]),
      afterSources: new Map([["src/photo.png", "same line\n"]]),
      beforeModules: [module("src/photo.ts")],
      afterModules: [module("src/photo.png")],
    });
    expect(overlay.renamePairs).toEqual([]);
  });

  it("updates lineDiffByPath for renamed file with delta vs original file", () => {
    const overlay = attachRenames({ overlay: overlayFromDiff(SIMILAR_BODY_DIFF) });
    const diff = overlay.lineDiffByPath.get("src/new-util.ts");
    expect(diff).toBeDefined();
    // Helper function was preserved; only the extra line was added!
    expect(diff?.addedLineNumbers).toEqual(new Set([4]));
    expect(diff?.removeBeforeLine.size).toBe(0);
  });

  it("produces 0 added lines for identical renamed file", () => {
    const overlay = attachRenames({
      overlay: overlayFromDiff("", {
        affectedModuleIds: new Set(["src/b.ts"]),
        deletedModuleIds: new Set(["src/a.ts"]),
        renamePairs: [{ from: "src/a.ts", to: "src/b.ts" }],
      }),
      beforeSources: new Map([["src/a.ts", "export const x = 1;\n"]]),
      afterSources: new Map([["src/b.ts", "export const x = 1;\n"]]),
    });
    const diff = overlay.lineDiffByPath.get("src/b.ts");
    expect(diff).toBeDefined();
    expect(diff?.addedLineNumbers.size).toBe(0);
    expect(diff?.removeBeforeLine.size).toBe(0);
  });
});

describe("applyDiffOverlay rename arrows", () => {
  it("keeps red/green cards and injects a yellow rename edge", () => {
    const graph = {
      modules: [module("src/new.ts")],
      groups: [],
      edges: [],
      diagnostics: [],
      root: ".",
    } as unknown as ProjectGraph;
    const text = [
      "diff --git a/src/old.ts b/src/new.ts",
      "similarity index 90%",
      "rename from src/old.ts",
      "rename to src/new.ts",
    ].join("\n");
    const partial = overlayFromPastedDiff(text, graph);
    const overlay = attachRenames({
      overlay: attachLineDiff({ ...partial, beforeLayout: null }, text),
    });
    expect(overlay.deletedModuleIds.has("src/old.ts")).toBe(true);
    expect(overlay.affectedModuleIds.has("src/new.ts")).toBe(true);

    const stamped = applyDiffOverlay(
      {
        nodes: [moduleNode("src/new.ts", "affected")],
        edges: [],
      },
      overlay,
    );
    expect(stamped.nodes.find((n) => n.id === "src/old.ts")?.data.diffState).toBe("deleted");
    expect(stamped.nodes.find((n) => n.id === "src/new.ts")?.data.diffState).toBe("affected");
    const renameEdge = stamped.edges.find((e) => e.data?.diffState === "renamed");
    expect(renameEdge?.source).toBe("src/old.ts");
    expect(renameEdge?.target).toBe("src/new.ts");
    const styled = styleEdge(renameEdge!, null);
    expect(styled.style?.stroke).toBe("#d97706");
    expect(styled.markerEnd).toBeDefined();
  });
});

function module(id: string) {
  return {
    id,
    path: id,
    label: id.split("/").pop() ?? id,
    language: "typescript" as const,
    groupId: null,
    isFacade: false,
    metrics: { loc: 1 },
    exportedSymbols: [] as string[],
  };
}

function moduleNode(id: string, diffState: "affected" | "deleted") {
  return {
    id,
    type: "module" as const,
    position: { x: 0, y: 0 },
    data: {
      label: id,
      isFacade: false,
      language: "typescript" as const,
      diffState,
    },
  };
}
