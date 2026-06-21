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

  it("L0 seeds the top-level collapse set and shrinks the visible graph", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const zoomed = vi.fn();
    store.on("zoom-changed", zoomed);
    const done = nextLayout(store);
    store.setZoomLevel(0);
    expect(zoomed).toHaveBeenCalledOnce();
    expect([...store.getCollapsedGroupIds()].sort()).toEqual(["app", "shared"]);
    await done;
    // Only the ungrouped main.ts survives the collapse.
    expect(store.getReducedGraph()?.modules.length).toBe(1);
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
    store.setZoomLevel(0);
    await done;

    const collapsed = boxOf("app");
    expect(collapsed?.width).toBe(expanded?.width);
    expect(collapsed?.height).toBe(expanded?.height);
  });

  it("setZoomLevel back to L1 restores the full graph", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    await new Promise<void>((r) => {
      store.once("layout-changed", () => r());
      store.setZoomLevel(0);
    });
    await new Promise<void>((r) => {
      store.once("layout-changed", () => r());
      store.setZoomLevel(1);
    });
    expect(store.getReducedGraph()?.modules.length).toBe(graph.modules.length);
  });
});
