import { describe, expect, it } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import {
  projectForZoom,
  allGroupIds,
  topLevelGroupIds,
  levelFromZoom,
} from "../src/domain/graph";
import type { ProjectGraph } from "../src/domain/graph";
import {
  expectNoBidirectionalGroupEdge,
  expectOnlyMainModule,
  importEdge,
} from "./helpers/zoom-projection-fixtures";

const graph = goldenGraph as unknown as ProjectGraph;
describe("levelFromZoom", () => {
  it("maps the zoom factor to L0/L1/L1.5/L2 by threshold", () => {
    expect(levelFromZoom(0.3)).toBe(0);
    expect(levelFromZoom(0.44)).toBe(0);
    expect(levelFromZoom(0.45)).toBe(1);
    expect(levelFromZoom(0.89)).toBe(1);
    expect(levelFromZoom(0.9)).toBe(1.5);
    expect(levelFromZoom(3.49)).toBe(1.5);
    expect(levelFromZoom(3.5)).toBe(2);
    expect(levelFromZoom(10)).toBe(2);
  });

  it("floors at L1 when L0 is disabled (diff mode)", () => {
    const disableL0 = { disableL0: true };
    expect(levelFromZoom(0.3, disableL0)).toBe(1);
    expect(levelFromZoom(0.44, disableL0)).toBe(1);
    expect(levelFromZoom(0.45, disableL0)).toBe(1);
    expect(levelFromZoom(0.9, disableL0)).toBe(1.5);
  });
});

describe("topLevelGroupIds", () => {
  it("returns the parentless groups", () => {
    expect(topLevelGroupIds(graph).sort()).toEqual(["app", "shared"]);
  });
});

describe("allGroupIds", () => {
  it("returns every group (the L0 collapse set)", () => {
    expect(allGroupIds(graph).sort()).toEqual([
      "app",
      "core",
      "services",
      "shared",
      "ui",
    ]);
  });
});

describe("projectForZoom", () => {
  it("is a no-op when nothing is collapsed", () => {
    const reduced = projectForZoom(graph, new Set());
    expect(reduced.modules).toHaveLength(graph.modules.length);
    expect(reduced.groups).toHaveLength(graph.groups.length);
  });

  it("collapsing the top-level groups hides their descendants but keeps the boxes", () => {
    const reduced = projectForZoom(graph, new Set(topLevelGroupIds(graph)));
    // Every module belongs (directly or via nesting) to app or shared → all hidden.
    // app + shared remain as boxes; nested core/services/ui disappear.
    expectOnlyMainModule(reduced, ["app", "shared"]);
  });

  it("collapsing every group keeps all group boxes visible at L0", () => {
    const reduced = projectForZoom(graph, new Set(allGroupIds(graph)));
    expectOnlyMainModule(reduced, ["app", "core", "services", "shared", "ui"]);
  });
  it("drops parent↔child group edges when every group is collapsed at L0", () => {
    const inferred: ProjectGraph = {
      version: 1,
      root: "x",
      groups: [
        {
          id: "folder:src",
          label: "Src",
          parentId: null,
          facadeModuleIds: ["src/index.ts"],
        },
        {
          id: "folder:src/core",
          label: "Core",
          parentId: "folder:src",
          facadeModuleIds: ["src/core/index.ts"],
        },
      ],
      modules: [
        {
          id: "src/index.ts",
          path: "src/index.ts",
          label: "index.ts",
          language: "typescript",
          groupId: "folder:src",
          isFacade: true,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
        {
          id: "src/core/store.ts",
          path: "src/core/store.ts",
          label: "store.ts",
          language: "typescript",
          groupId: "folder:src/core",
          isFacade: false,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
      ],
      edges: [importEdge("src/core/store.ts", "src/index.ts")],
      diagnostics: [],
    };
    const reduced = projectForZoom(inferred, new Set(allGroupIds(inferred)));
    expectNoBidirectionalGroupEdge(reduced, "folder:src/core", "folder:src");
  });

  it("drops group↔grandparent group edges when every group is collapsed at L0", () => {
    const inferred: ProjectGraph = {
      version: 1,
      root: "x",
      groups: [
        { id: "folder:src", label: "Src", parentId: null, facadeModuleIds: [] },
        {
          id: "folder:src/core",
          label: "Core",
          parentId: "folder:src",
          facadeModuleIds: [],
        },
        {
          id: "folder:src/core/db",
          label: "Db",
          parentId: "folder:src/core",
          facadeModuleIds: ["src/core/db/index.ts"],
        },
      ],
      modules: [
        {
          id: "src/index.ts",
          path: "src/index.ts",
          label: "index.ts",
          language: "typescript",
          groupId: "folder:src",
          isFacade: true,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
        {
          id: "src/core/db/conn.ts",
          path: "src/core/db/conn.ts",
          label: "conn.ts",
          language: "typescript",
          groupId: "folder:src/core/db",
          isFacade: false,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
      ],
      edges: [importEdge("src/core/db/conn.ts", "src/index.ts")],
      diagnostics: [],
    };
    // db→src collapses to folder:src/core/db → folder:src (grandparent).
    const reduced = projectForZoom(inferred, new Set(allGroupIds(inferred)));
    expectNoBidirectionalGroupEdge(reduced, "folder:src/core/db", "folder:src");
  });

  it("collapsing inferred folder groups hides every grouped module at L0", () => {
    const inferred: ProjectGraph = {
      version: 1,
      root: "x",
      groups: [
        {
          id: "folder:src",
          label: "Src",
          parentId: null,
          facadeModuleIds: [],
        },
        {
          id: "folder:src/core",
          label: "Core",
          parentId: "folder:src",
          facadeModuleIds: ["src/core/index.ts"],
        },
      ],
      modules: [
        {
          id: "src/main.ts",
          path: "src/main.ts",
          label: "main.ts",
          language: "typescript",
          groupId: "folder:src",
          isFacade: false,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
        {
          id: "src/core/index.ts",
          path: "src/core/index.ts",
          label: "index.ts",
          language: "typescript",
          groupId: "folder:src/core",
          isFacade: true,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
        {
          id: "src/core/store.ts",
          path: "src/core/store.ts",
          label: "store.ts",
          language: "typescript",
          groupId: "folder:src/core",
          isFacade: false,
          metrics: { loc: 1 },
          exportedSymbols: [],
        },
      ],
      edges: [],
      diagnostics: [],
    };
    const reduced = projectForZoom(inferred, new Set(allGroupIds(inferred)));
    expect(reduced.modules).toHaveLength(0);
    expect(reduced.groups.map((g) => g.id).sort()).toEqual([
      "folder:src",
      "folder:src/core",
    ]);
  });

  it("re-routes an edge into a collapsed group's private module onto the group box", () => {
    // main.ts → core/index.ts; collapse `app` (core's ancestor) → target becomes `app`.
    const reduced = projectForZoom(graph, new Set(["app"]));
    const rerouted = reduced.edges.find(
      (e) => e.source === "src/main.ts" && e.target === "app",
    );
    expect(rerouted).toBeDefined();
    expect(reduced.edges.some((e) => e.target === "src/core/index.ts")).toBe(
      false,
    );
  });

  it("drops edges that collapse onto themselves and dedups parallels", () => {
    const reduced = projectForZoom(graph, new Set(["app"]));
    // No self-loops.
    expect(reduced.edges.every((e) => e.source !== e.target)).toBe(true);
    // Edge ids are unique after re-route + dedup.
    const ids = reduced.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("aggregates a violation onto the collapsed edge", () => {
    // TodoList → core/store is a violation, both inside `app`. Collapsing `app`
    // makes it a self-loop (dropped). Collapse only `core` instead so the
    // violation crosses ui→core and is preserved on the rerouted edge.
    const reduced = projectForZoom(graph, new Set(["core"]));
    const edge = reduced.edges.find(
      (e) => e.source === "src/ui/TodoList.tsx" && e.target === "core",
    );
    expect(edge?.isViolation).toBe(true);
  });

  it("expanding a single group re-reveals only its modules", () => {
    // Collapse app + shared, then expand `core` is impossible (its ancestor app
    // is collapsed). But collapsing only shared + ui keeps core/services modules.
    const reduced = projectForZoom(graph, new Set(["shared", "ui"]));
    expect(reduced.modules.some((m) => m.id === "src/core/store.ts")).toBe(true);
    expect(reduced.modules.some((m) => m.id === "src/ui/App.tsx")).toBe(false);
  });
});
