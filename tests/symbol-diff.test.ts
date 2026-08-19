import { describe, expect, it } from "vitest";
import golden from "./fixtures/golden/project-graph.json";
import type { ProjectGraph, ProjectedGraph, RFNode } from "../src/domain/graph";
import {
  applyDiffOverlay,
  attachLineDiff,
  classifySymbolChanges,
  lineDiffsFromUnified,
  overlayFromPastedDiff,
  type GraphDiffOverlay,
} from "../src/domain/diff";

const base = golden as unknown as ProjectGraph;
const module = base.modules.find((item) => item.id === "src/core/store.ts")!;

describe("classifySymbolChanges", () => {
  it("distinguishes added, removed, and implementation-modified symbols", () => {
    const result = classifySymbolChanges(implementationChangeInput());

    expect(result.addedSymbolIds).toEqual(new Set([`${module.id}::added`]));
    expect(result.removedSymbolIds).toEqual(new Set([`${module.id}::removed`]));
    expect(result.modifiedSymbolIds).toEqual(new Set([`${module.id}::kept`]));
  });

  it("marks a shared symbol when only its declaration changes", () => {
    const graph = graphWithSymbols(["kept"]);
    const lineDiffByPath = lineDiffsFromUnified([
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1 +1 @@",
      "-export function kept(value: string) {}",
      "+export function kept(value: number) {}",
    ].join("\n"));

    const result = classifySymbolChanges({
      before: graph,
      after: graph,
      beforeSources: new Map([[module.path, "export function kept(value: string) {}"]]),
      afterSources: new Map([[module.path, "export function kept(value: number) {}"]]),
      lineDiffByPath,
    });

    expect(result.modifiedSymbolIds).toEqual(new Set([`${module.id}::kept`]));
  });
});

function implementationChangeInput() {
  return {
    before: graphWithSymbols(["kept", "untouched", "removed"]),
    after: graphWithSymbols(["kept", "untouched", "added"]),
    beforeSources: new Map([[module.path, sourceWith("return 1;", "removed")]]),
    afterSources: new Map([[module.path, sourceWith("return 2;", "added")]]),
    lineDiffByPath: lineDiffsFromUnified([
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,5 +1,5 @@",
      " export function kept() {",
      "-  return 1;",
      "+  return 2;",
      " }",
      " export function untouched() {}",
      "-export function removed() {}",
      "+export function added() {}",
    ].join("\n")),
  };
}

describe("applyDiffOverlay symbol states", () => {
  it("stamps current symbols and restores removed symbol boxes", () => {
    const overlay = symbolOverlay();
    const stamped = applyDiffOverlay(projectedSymbols(), overlay);

    expect(stateOf(stamped.nodes, "m.ts::added")).toBe("added");
    expect(stateOf(stamped.nodes, "m.ts::kept")).toBe("modified");
    expect(stateOf(stamped.nodes, "m.ts::removed")).toBe("removed");
  });
});

function graphWithSymbols(exportedSymbols: string[]): ProjectGraph {
  return {
    ...base,
    modules: base.modules.map((item) =>
      item.id === module.id ? { ...item, exportedSymbols } : item,
    ),
  };
}

function sourceWith(returnStatement: string, finalSymbol: string) {
  return [
    "export function kept() {",
    `  ${returnStatement}`,
    "}",
    "export function untouched() {}",
    `export function ${finalSymbol}() {}`,
  ].join("\n");
}

function projectedSymbols(): ProjectedGraph {
  return {
    nodes: [
      {
        id: "m.ts",
        type: "module" as const,
        position: { x: 0, y: 0 },
        width: 120,
        height: 90,
        data: {
          label: "m.ts",
          isFacade: false,
          language: "typescript" as const,
          showSymbols: true,
          symbols: [
            symbolDescriptor("m.ts::added", "added", 10),
            symbolDescriptor("m.ts::kept", "kept", 30),
          ],
        },
      },
    ],
    edges: [],
  };
}

function symbolDescriptor(id: string, label: string, y: number) {
  return {
    id,
    label,
    kind: "function" as const,
    x: 10,
    y,
    width: 50,
    height: 16,
  };
}

function symbolOverlay(): GraphDiffOverlay {
  const partial = overlayFromPastedDiff("", base);
  return attachLineDiff({
    ...partial,
    addedSymbolIds: new Set(["m.ts::added"]),
    removedSymbolIds: new Set(["m.ts::removed"]),
    modifiedSymbolIds: new Set(["m.ts::kept"]),
    beforeLayout: {
      groups: [],
      modules: [{ id: "m.ts", parentId: null, x: 0, y: 0, width: 120, height: 90 }],
      symbols: [{ id: "m.ts::removed", parentId: "m.ts", x: 10, y: 50, width: 50, height: 16 }],
      descriptions: [],
      width: 120,
      height: 90,
    },
  }, null);
}

function stateOf(nodes: RFNode[], id: string) {
  for (const node of nodes) {
    if (node.type !== "module") continue;
    const symbol = node.data.symbols?.find((entry) => entry.id === id);
    if (symbol) return symbol.diffState;
  }
  return undefined;
}
