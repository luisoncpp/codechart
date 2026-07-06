import { describe, expect, it } from "vitest";
import type { Edge, ModuleNode, ProjectGraph } from "../src/domain/graph";
import { importedSymbolTargets } from "../src/features/graph_canvas/Private/preview_frames/imported-symbol-resolver";

function makeModule(id: string, exportedSymbols: string[]): ModuleNode {
  return {
    id,
    path: id,
    label: id,
    language: "typescript",
    groupId: null,
    isFacade: false,
    metrics: { loc: 10 },
    exportedSymbols,
  };
}

function makeImport(source: string, target: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    kind: "import",
    trigger: "import",
    isViolation: false,
  };
}

function makeGraph(modules: ModuleNode[], edges: Edge[]): ProjectGraph {
  return { version: 1, root: "/repo", groups: [], modules, edges, diagnostics: [] };
}

describe("importedSymbolTargets", () => {
  const graph = makeGraph(
    [
      makeModule("a.ts", ["fromA"]),
      makeModule("b.ts", ["Widget", "helper"]),
      makeModule("c.ts", ["Widget", "onlyInC"]),
      makeModule("unrelated.ts", ["hidden"]),
    ],
    [
      makeImport("a.ts", "b.ts"),
      makeImport("a.ts", "c.ts"),
      makeImport("b.ts", "c.ts"),
    ],
  );

  it("maps imported symbol names to their defining module", () => {
    const targets = importedSymbolTargets(graph, "a.ts");
    expect(targets.get("helper")).toEqual({ moduleId: "b.ts", path: "b.ts" });
    expect(targets.get("onlyInC")).toEqual({ moduleId: "c.ts", path: "c.ts" });
  });

  it("ignores symbols of modules the source does not import", () => {
    const targets = importedSymbolTargets(graph, "a.ts");
    expect(targets.has("hidden")).toBe(false);
    expect(targets.has("fromA")).toBe(false);
  });

  it("resolves a name collision to the first importing edge", () => {
    const targets = importedSymbolTargets(graph, "a.ts");
    expect(targets.get("Widget")?.moduleId).toBe("b.ts");
  });

  it("ignores non-import edges", () => {
    const soft = makeGraph(
      [makeModule("a.ts", []), makeModule("b.ts", ["Widget"])],
      [{ ...makeImport("a.ts", "b.ts"), kind: "soft" }],
    );
    expect(importedSymbolTargets(soft, "a.ts").size).toBe(0);
  });
});
