import { describe, expect, it } from "vitest";
import trivialGraph from "./fixtures/trivial-graph.json";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { ProjectGraph } from "../src/domain/graph";

describe("ProjectGraph contract", () => {
  it("parses the trivial fixture JSON on the TypeScript side", () => {
    const graph = trivialGraph as ProjectGraph;

    expect(graph.version).toBe(1);
    expect(graph.modules).toHaveLength(1);
    expect(graph.modules[0].id).toBe("src/index.ts");
    expect(graph.modules[0].isFacade).toBe(true);
  });

  it("parses the golden North Star JSON on the TypeScript side", () => {
    const graph = goldenGraph as ProjectGraph;

    expect(graph.groups).toHaveLength(5);
    expect(graph.modules).toHaveLength(13);
    expect(graph.edges).toHaveLength(20);
    expect(graph.diagnostics).toHaveLength(2);
    const kinds = graph.diagnostics.map((d) => d.kind);
    expect(kinds).toContain("unresolvedImport");
    expect(kinds).toContain("architectureViolation");

    const facades = graph.modules.filter((m) => m.isFacade);
    expect(facades).toHaveLength(3);

    // Planted facade bypass is present and flagged as a violation (Phase 8).
    const bypass = graph.edges.find(
      (e) => e.source === "src/ui/TodoList.tsx" && e.target === "src/core/store.ts",
    );
    expect(bypass?.isViolation).toBe(true);

    const annotated = graph.modules.find((m) => m.id === "src/services/http.ts");
    expect(annotated?.annotation).toBeDefined();

    const core = graph.groups.find((g) => g.id === "core");
    expect(core?.annotation?.descriptionLong).toBeDefined();
    expect(core?.parentId).toBe("app");

    const shared = graph.modules
      .filter((m) => m.groupId === "shared")
      .map((m) => m.id);
    expect(shared).toEqual(["src/core/todo.ts", "src/services/types.ts"]);
  });
});
