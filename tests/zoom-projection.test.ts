import { describe, expect, it } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import {
  projectForZoom,
  topLevelGroupIds,
  levelFromZoom,
} from "../src/domain/graph";
import type { ProjectGraph } from "../src/domain/graph";

const graph = goldenGraph as unknown as ProjectGraph;

describe("levelFromZoom", () => {
  it("maps the zoom factor to L0/L1/L2 by threshold", () => {
    expect(levelFromZoom(0.3)).toBe(0);
    expect(levelFromZoom(0.54)).toBe(0);
    expect(levelFromZoom(0.55)).toBe(1);
    expect(levelFromZoom(1.0)).toBe(1);
    expect(levelFromZoom(1.69)).toBe(1);
    expect(levelFromZoom(1.7)).toBe(2);
    expect(levelFromZoom(3)).toBe(2);
  });
});

describe("topLevelGroupIds", () => {
  it("returns the parentless groups (the L0 collapse set)", () => {
    expect(topLevelGroupIds(graph).sort()).toEqual(["app", "shared"]);
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
    expect(reduced.modules.map((m) => m.id)).toEqual(["src/main.ts"]); // only ungrouped survives
    // app + shared remain as boxes; nested core/services/ui disappear.
    expect(reduced.groups.map((g) => g.id).sort()).toEqual(["app", "shared"]);
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
