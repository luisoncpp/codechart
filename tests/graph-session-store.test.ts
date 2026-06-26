import { describe, expect, it, vi } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { GraphSessionStore } from "../src/state/graph-session";
import { ElkLayoutEngine } from "../src/domain/layout";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { ProjectGraph } from "../src/domain/graph";

const graph = goldenGraph as unknown as ProjectGraph;

function clientReturning(g: ProjectGraph): AnalysisClient {
  return { analyzeProject: async () => g, readModuleSource: async () => "" };
}

function newStore(client: AnalysisClient): GraphSessionStore {
  return new GraphSessionStore(client, new ElkLayoutEngine());
}

/** Resolve once the store finishes its next async re-layout. */
function nextLayout(store: GraphSessionStore): Promise<void> {
  return new Promise((resolve) => store.once("layout-changed", () => resolve()));
}

describe("GraphSessionStore (no DOM)", () => {
  it("starts idle", () => {
    expect(newStore(clientReturning(graph)).getPhase()).toBe("idle");
  });

  it("loads → ready with a computed layout", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    expect(store.getPhase()).toBe("ready");
    expect(store.getGraph()).not.toBeNull();
    expect(store.getLayout()?.modules.length).toBe(graph.modules.length);
  });

  it("an empty graph yields the empty phase and no layout", async () => {
    const empty = { ...graph, modules: [], edges: [] };
    const store = newStore(clientReturning(empty));
    await store.loadProject("/x");
    expect(store.getPhase()).toBe("empty");
    expect(store.getLayout()).toBeNull();
  });

  it("a client error yields the failed phase with a message", async () => {
    const store = newStore({
      analyzeProject: async () => {
        throw new Error("boom");
      },
      readModuleSource: async () => "",
    });
    await store.loadProject("/x");
    expect(store.getPhase()).toBe("failed");
    expect(store.getError()).toBe("boom");
  });

  it("select emits selection-changed and stores the id", () => {
    const store = newStore(clientReturning(graph));
    const listener = vi.fn();
    store.on("selection-changed", listener);
    store.select("src/core/index.ts");
    expect(store.getSelectedId()).toBe("src/core/index.ts");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("selecting the same id again does not re-emit", () => {
    const store = newStore(clientReturning(graph));
    const listener = vi.fn();
    store.select("a");
    store.on("selection-changed", listener);
    store.select("a");
    expect(listener).not.toHaveBeenCalled();
  });

  it("loading clears any previous selection", async () => {
    const store = newStore(clientReturning(graph));
    store.select("a");
    await store.loadProject("/x");
    expect(store.getSelectedId()).toBeNull();
  });
});

describe("GraphSessionStore semantic zoom", () => {
  it("starts at L1 with a full reduced graph", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    expect(store.getZoomLevel()).toBe(1);
    expect(store.getReducedGraph()?.modules.length).toBe(graph.modules.length);
  });

  it("L0 seeds the all-group collapse set and shrinks the visible graph", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const zoomed = vi.fn();
    store.on("zoom-changed", zoomed);
    store.setZoomLevel(0);
    expect(zoomed).toHaveBeenCalledOnce();
    expect([...store.getCollapsedGroupIds()].sort()).toEqual([
      "app",
      "core",
      "services",
      "shared",
      "ui",
    ]);
    // Only the ungrouped main.ts survives the collapse.
    expect(store.getReducedGraph()?.modules.length).toBe(1);
    expect(store.getReducedGraph()?.groups.map((g) => g.id).sort()).toEqual([
      "app",
      "core",
      "services",
      "shared",
      "ui",
    ]);
  });

  it("L0↔L1 keeps every group box at the same footprint (projection-only)", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const atL1 = new Map(
      store.getLayout()!.groups.map((g) => [g.id, { x: g.x, y: g.y, width: g.width, height: g.height }]),
    );
    store.setZoomLevel(0);
    for (const g of store.getLayout()!.groups) {
      expect(atL1.get(g.id)).toEqual({ x: g.x, y: g.y, width: g.width, height: g.height });
    }
    store.setZoomLevel(1);
    for (const g of store.getLayout()!.groups) {
      expect(atL1.get(g.id)).toEqual({ x: g.x, y: g.y, width: g.width, height: g.height });
    }
  });

  it("toggleGroup flips a single group's collapse state", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const done = nextLayout(store);
    store.collapseGroup("ui");
    expect(store.getCollapsedGroupIds().has("ui")).toBe(true);
    await done;
    const done2 = nextLayout(store);
    store.expandGroup("ui");
    expect(store.getCollapsedGroupIds().has("ui")).toBe(false);
    await done2;
  });

  it("L1.5 reveals symbol boxes without re-layout (footprint unchanged)", async () => {
    const client: AnalysisClient = {
      analyzeProject: async () => graph,
      readModuleSource: async () => {
        throw new Error("should not fetch source at L1.5");
      },
    };
    const store = newStore(client);
    await store.loadProject("/x");
    const defaultBox = store.getLayout()?.modules.find((m) => m.id === "src/main.ts");
    store.setZoomLevel(1.5);
    const symbolBox = store.getLayout()?.modules.find((m) => m.id === "src/main.ts");
    expect(symbolBox).toEqual(defaultBox);
    expect(store.getSourceCache().size).toBe(0);
  });

  it("L2 reuses the same module footprint as L1 (only projection changes)", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const at1 = store.getLayout()?.modules.find((m) => m.id === "src/main.ts");
    const done2 = nextLayout(store);
    store.setZoomLevel(2);
    await done2;
    const at2 = store.getLayout()?.modules.find((m) => m.id === "src/main.ts");
    expect(at2).toEqual(at1);
  });

  it("L2 lazily fetches and caches module source", async () => {
    const client: AnalysisClient = {
      analyzeProject: async () => graph,
      readModuleSource: async (_root, path) => `// source of ${path}`,
    };
    const store = newStore(client);
    await store.loadProject("/x");
    const done = nextLayout(store);
    store.setZoomLevel(2);
    await done;
    expect(store.getSourceCache().size).toBe(graph.modules.length);
    expect(store.getSourceCache().get("src/services/http.ts")).toContain(
      "source of src/services/http.ts",
    );
  });

  it("a collapsed group keeps its expanded footprint (does not shrink)", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const boxOf = (id: string) =>
      store.getLayout()?.groups.find((g) => g.id === id);
    const expanded = boxOf("app");
    expect(expanded).toBeDefined();

    const done = nextLayout(store);
    store.collapseGroup("app");
    await done;

    const collapsed = boxOf("app");
    expect(collapsed?.width).toBe(expanded?.width);
    expect(collapsed?.height).toBe(expanded?.height);
  });

  it("setZoomLevel back to L1 restores the full graph", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.setZoomLevel(0);
    store.setZoomLevel(1);
    expect(store.getReducedGraph()?.modules.length).toBe(graph.modules.length);
  });
});

describe("GraphSessionStore hide tests", () => {
  const withTests: ProjectGraph = {
    ...graph,
    groups: [
      ...graph.groups,
      { id: "tests", label: "Tests", parentId: null, facadeModuleIds: [], color: "#000" },
    ],
    modules: [
      ...graph.modules,
      {
        id: "tests/smoke.test.ts",
        path: "tests/smoke.test.ts",
        label: "smoke.test.ts",
        language: "typescript",
        groupId: "tests",
        isFacade: false,
        metrics: { loc: 10 },
        exportedSymbols: [],
      },
    ],
    edges: [
      ...graph.edges,
      {
        id: "tests/smoke.test.ts->src/main.ts:import:0",
        source: "tests/smoke.test.ts",
        target: "src/main.ts",
        kind: "import",
        isViolation: false,
      },
    ],
  };

  it("hides test modules and re-layouts when enabled", async () => {
    const store = newStore(clientReturning(withTests));
    await store.loadProject("/x");
    expect(store.getReducedGraph()?.modules.some((m) => m.id === "tests/smoke.test.ts")).toBe(
      true,
    );

    const done = nextLayout(store);
    store.setHideTests(true);
    await done;

    expect(store.getHideTests()).toBe(true);
    expect(store.getReducedGraph()?.modules.some((m) => m.id === "tests/smoke.test.ts")).toBe(
      false,
    );
    expect(store.getLayout()?.modules.some((m) => m.id === "tests/smoke.test.ts")).toBe(false);
  });

  it("clears selection when the selected module is hidden", async () => {
    const store = newStore(clientReturning(withTests));
    await store.loadProject("/x");
    store.select("tests/smoke.test.ts");
    store.setHideTests(true);
    expect(store.getSelectedId()).toBeNull();
  });

  it("resets hide-tests when loading a new project", async () => {
    const store = newStore(clientReturning(withTests));
    await store.loadProject("/x");
    store.setHideTests(true);
    await store.loadProject("/y");
    expect(store.getHideTests()).toBe(false);
  });

  it("L0 + hide tests keeps non-test groups in the reduced graph", async () => {
    const store = newStore(clientReturning(withTests));
    await store.loadProject("/x");
    store.setZoomLevel(0);
    const done = nextLayout(store);
    store.setHideTests(true);
    await done;
    expect(store.getReducedGraph()?.groups.map((g) => g.id).sort()).toEqual([
      "app",
      "core",
      "services",
      "shared",
      "ui",
    ]);
  });

  it("L1 hide tests → L0 → unhide → L1 keeps grouped modules in layout", async () => {
    const store = newStore(clientReturning(withTests));
    await store.loadProject("/x");
    const done1 = nextLayout(store);
    store.setHideTests(true);
    await done1;
    store.setZoomLevel(0);
    const done2 = nextLayout(store);
    store.setHideTests(false);
    await done2;
    store.setZoomLevel(1);
    expect(store.getReducedGraph()?.modules.length).toBe(withTests.modules.length);
    expect(store.getLayout()?.modules.some((m) => m.id === "src/services/http.ts")).toBe(true);
  });
});

describe("GraphSessionStore connection disconnect", () => {
  it("seeds disconnected groups from graph defaults on load", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    expect(store.getDisconnectedGroupIds().has("shared")).toBe(true);
    expect(store.getReducedGraph()!.edges.length).toBeLessThan(graph.edges.length);
  });

  it("reconnecting a group restores its edges in the reduced graph", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const hidden = store.getReducedGraph()!.edges.length;
    store.toggleGroupConnection("shared", /*disconnect=*/ false);
    expect(store.getReducedGraph()!.edges.length).toBeGreaterThan(hidden);
  });
});
