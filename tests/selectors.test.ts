import { describe, expect, it } from "vitest";
import graph from "./fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../src/domain/graph";
import {
  findGroup,
  modulesInGroup,
  groupImportsOf,
  groupImportedBy,
  edgeFocusForSelection,
  moduleIdsInGroupTree,
} from "../src/domain/graph";

const project = graph as ProjectGraph;

describe("group selectors", () => {
  it("finds a group and its direct modules", () => {
    expect(findGroup(project, "core")?.label).toBe("Core");
    expect(modulesInGroup(project, "core").map((m) => m.id)).toContain(
      "src/core/store.ts",
    );
  });

  it("collects modules from nested child groups", () => {
    const scope = moduleIdsInGroupTree(project, "app");
    expect(scope.has("src/core/store.ts")).toBe(true);
    expect(scope.has("src/ui/index.ts")).toBe(true);
    expect(modulesInGroup(project, "app")).toHaveLength(0);
  });

  it("lists cross-boundary imports for a group tree", () => {
    const imports = groupImportsOf(project, "ui");
    expect(imports.some((e) => e.target === "src/core/index.ts")).toBe(true);
    const inbound = groupImportedBy(project, "core");
    expect(inbound.some((e) => e.source.startsWith("src/ui/"))).toBe(true);
  });

  it("builds edge focus for a group selection", () => {
    const focus = edgeFocusForSelection(project, "core");
    expect(focus).toEqual({
      groupId: "core",
      moduleIds: moduleIdsInGroupTree(project, "core"),
    });
  });
});
