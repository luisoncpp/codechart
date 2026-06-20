import { describe, expect, it, vi } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { GraphSessionStore } from "../src/state/graph-session";
import { ElkLayoutEngine } from "../src/domain/layout";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { ProjectGraph } from "../src/domain/graph";

const graph = goldenGraph as unknown as ProjectGraph;

function clientReturning(g: ProjectGraph): AnalysisClient {
  return { analyzeProject: async () => g };
}

function newStore(client: AnalysisClient): GraphSessionStore {
  return new GraphSessionStore(client, new ElkLayoutEngine());
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
