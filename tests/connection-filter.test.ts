import { describe, it, expect } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../src/domain/graph";
import {
  filterDisconnectedEdges,
  defaultDisconnectedSets,
  countHiddenEdges,
  isGroupDisconnected,
  isModuleDisconnected,
  groupParentMap,
} from "../src/domain/graph";

const graph = goldenGraph as unknown as ProjectGraph;

describe("filterDisconnectedEdges", () => {
  it("hides edges touching a disconnected group", () => {
    const groups = new Set(["shared"]);
    const filtered = filterDisconnectedEdges(graph, groups, new Set());
    const hidden = countHiddenEdges(graph, groups, new Set());
    expect(hidden).toBeGreaterThan(0);
    for (const e of filtered.edges) {
      const touchesShared = graph.modules
        .filter((m) => m.groupId === "shared")
        .some((m) => e.source === m.id || e.target === m.id);
      expect(touchesShared).toBe(false);
    }
  });

  it("hides edges for an individually disconnected module", () => {
    const modules = new Set(["src/core/store.ts"]);
    const filtered = filterDisconnectedEdges(graph, new Set(), modules);
    for (const e of filtered.edges) {
      expect(e.source).not.toBe("src/core/store.ts");
      expect(e.target).not.toBe("src/core/store.ts");
    }
  });

  it("seeds defaults from group config", () => {
    const graphWithDefault = {
      ...graph,
      groups: graph.groups.map((g) =>
        g.id === "shared" ? { ...g, disconnectedByDefault: true } : g,
      ),
    };
    const { groups, modules } = defaultDisconnectedSets(graphWithDefault);
    expect([...groups]).toEqual(["shared"]);
    expect(modules.size).toBe(0);
  });
});

describe("isGroupDisconnected", () => {
  it("inherits from a disconnected ancestor", () => {
    const parentOf = groupParentMap(graph);
    expect(isGroupDisconnected("core", new Set(["app"]), parentOf)).toBe(true);
    expect(isGroupDisconnected("shared", new Set(["app"]), parentOf)).toBe(false);
  });
});

describe("isModuleDisconnected", () => {
  it("follows group disconnect", () => {
    expect(
      isModuleDisconnected("src/core/todo.ts", graph, new Set(["shared"]), new Set()),
    ).toBe(true);
  });
});
