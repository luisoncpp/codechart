import { describe, expect, it } from "vitest";
import type { Edge, ModuleNode, ProjectGraph } from "../src/domain/graph";
import {
  combinedSymbolTargets,
  importedSymbolTargets,
  sourcePrefetchIds,
} from "../src/features/graph_canvas/Private/preview_frames/imported-symbol-resolver";

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

describe("combinedSymbolTargets", () => {
  const graph = makeGraph(
    [makeModule("a.ts", []), makeModule("b.ts", ["Store", "helper"])],
    [makeImport("a.ts", "b.ts")],
  );
  const A_SOURCE = "function helper() {\n}\nfunction localOnly() {\n}";
  const B_SOURCE = "export class Store {\n  fetchThing(id: string): string {\n    return id;\n  }\n}";

  it("falls back to imported exports when no sources are cached", () => {
    const targets = combinedSymbolTargets(graph, "a.ts", new Map());
    expect(targets.get("Store")?.moduleId).toBe("b.ts");
    expect(targets.has("fetchThing")).toBe(false);
  });

  it("prefers an own-module definition over an imported export", () => {
    const sources = new Map([["a.ts", A_SOURCE]]);
    const targets = combinedSymbolTargets(graph, "a.ts", sources);
    expect(targets.get("helper")?.moduleId).toBe("a.ts");
    expect(targets.get("localOnly")?.moduleId).toBe("a.ts");
  });

  it("resolves methods scanned from an imported module's source", () => {
    const sources = new Map([["b.ts", B_SOURCE]]);
    const targets = combinedSymbolTargets(graph, "a.ts", sources);
    expect(targets.get("fetchThing")).toEqual({ moduleId: "b.ts", path: "b.ts" });
    expect(targets.get("Store")?.moduleId).toBe("b.ts");
  });
});

describe("C++ header → same-stem implementation", () => {
  const graph = makeGraph(
    [
      makeModule("Public/Foo.h", ["AFoo"]),
      makeModule("Private/Foo.cpp", []),
      makeModule("Private/Bar.cpp", []),
    ],
    [makeImport("Private/Foo.cpp", "Public/Foo.h"), makeImport("Private/Bar.cpp", "Public/Foo.h")],
  );
  const sources = new Map([
    ["Public/Foo.h", "class AFoo\n{\n  void Tick(float DeltaTime) override;\n  void Other();\n};"],
    ["Private/Foo.cpp", "#include \"Foo.h\"\nvoid AFoo::Tick(float DeltaTime)\n{\n}"],
    ["Private/Bar.cpp", "void Other()\n{\n}"],
  ]);

  it("resolves a header member declaration to its implementation file", () => {
    const targets = combinedSymbolTargets(graph, "Public/Foo.h", sources);
    expect(targets.get("Tick")?.moduleId).toBe("Private/Foo.cpp");
  });

  it("ignores importers with a different stem", () => {
    const targets = combinedSymbolTargets(graph, "Public/Foo.h", sources);
    expect(targets.has("Other")).toBe(false);
  });

  it("prefetches the implementation file of a header", () => {
    expect(sourcePrefetchIds(graph, "Public/Foo.h")).toEqual(["Public/Foo.h", "Private/Foo.cpp"]);
  });
});

describe("sourcePrefetchIds", () => {
  it("lists the module itself plus its import targets", () => {
    const graph = makeGraph(
      [makeModule("a.ts", []), makeModule("b.ts", []), makeModule("c.ts", [])],
      [makeImport("a.ts", "b.ts"), makeImport("c.ts", "a.ts")],
    );
    expect(sourcePrefetchIds(graph, "a.ts")).toEqual(["a.ts", "b.ts"]);
  });
});
