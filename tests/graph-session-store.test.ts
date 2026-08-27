import { describe, expect, it, vi } from "vitest";
import goldenGraph from "./fixtures/golden/project-graph.json";
import { GraphSessionStore } from "../src/state/graph-session";
import { createMockGitClient } from "../src/ipc/git-client";
import type { AnalysisClient } from "../src/ipc/analysis-client";
import type { ProjectGraph } from "../src/domain/graph";
import type { GitClient } from "../src/ipc/git-client";
import { ElkLayoutEngine } from "../src/domain/layout";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";

const graph = goldenGraph as unknown as ProjectGraph;

const noSearchResults = async () => ({ matches: [], truncated: false });

function clientReturning(g: ProjectGraph): AnalysisClient {
  return {
    analyzeProject: async () => g,
    readModuleSource: async () => "",
    searchModuleSources: noSearchResults,
  };
}

function newStore(client: AnalysisClient): GraphSessionStore {
  return testGraphSessionStore(client);
}

/** Resolve once the store finishes its next async re-layout. */
function nextLayout(store: GraphSessionStore): Promise<void> {
  return new Promise((resolve) => store.once("layout-changed", () => resolve()));
}

async function readyStoreAtZoomLevel2(client: AnalysisClient): Promise<GraphSessionStore> {
  const store = newStore(client);
  await store.loadProject("/x");
  const done = nextLayout(store);
  store.setZoomLevel(2);
  await done;
  return store;
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

  it("uses 90 metric days by default and can reanalyze with another window", async () => {
    const analyzeProject = vi.fn(async () => graph);
    const store = newStore({
      analyzeProject,
      readModuleSource: async () => "",
      searchModuleSources: noSearchResults,
    });
    await store.loadProject("/x");
    expect(analyzeProject).toHaveBeenLastCalledWith("/x", {
      metricsWindowDays: 90,
      hideTopLevelDotDirs: true,
    });

    await store.setMetricsWindowDays(14);

    expect(analyzeProject).toHaveBeenLastCalledWith("/x", {
      metricsWindowDays: 14,
      hideTopLevelDotDirs: true,
    });
    expect(store.getMetricsWindowDays()).toBe(14);
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

  it("navigates selection history without adding new entries", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.select("src/core/index.ts");
    store.select("src/core/store.ts");
    store.select("core");
    await store.goBack();
    expect(store.getSelectedId()).toBe("src/core/store.ts");
    await store.goBack();
    expect(store.getSelectedId()).toBe("src/core/index.ts");
    expect(store.canGoBack()).toBe(false);
    await store.goForward();
    await store.goForward();
    expect(store.getSelectedId()).toBe("core");
    expect(store.canGoForward()).toBe(false);
  });

  it("a new selection truncates forward history", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.select("src/core/index.ts");
    store.select("src/core/store.ts");
    await store.goBack();
    store.select("src/main.ts");
    expect(store.canGoForward()).toBe(false);
    await store.goBack();
    expect(store.getSelectedId()).toBe("src/core/index.ts");
  });

  it("focusOn selects the module and emits focus-requested", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    const focusListener = vi.fn();
    store.on("focus-requested", focusListener);
    await store.focusOn("src/core/store.ts");
    expect(store.getSelectedId()).toBe("src/core/store.ts");
    expect(store.getFocusRequest()?.id).toBe("src/core/store.ts");
    expect(focusListener).toHaveBeenCalledOnce();
  });

  it("focusOn expands collapsed ancestor groups at L0", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.setZoomLevel(/*level=*/0);
    expect(store.getCollapsedGroupIds().has("core")).toBe(true);
    await store.focusOn("src/core/store.ts");
    expect(store.getCollapsedGroupIds().has("core")).toBe(false);
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

  it("expanding a nested group at L0 also expands its collapsed ancestors", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.setZoomLevel(0);
    expect(store.getCollapsedGroupIds().has("app")).toBe(true); // core's parent
    const done = nextLayout(store);
    store.toggleGroup("core");
    await done;
    expect(store.getCollapsedGroupIds().has("core")).toBe(false);
    expect(store.getCollapsedGroupIds().has("app")).toBe(false);
    const visible = store.getReducedGraph()!.modules.map((m) => m.id);
    expect(visible).toContain("src/core/store.ts");
  });

  it("an L0 re-layout keeps the zoom-reduced display graph", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.setZoomLevel(0);
    const done = nextLayout(store);
    store.toggleGroup("core");
    await done;
    // "ui" stays collapsed: its modules must not reappear in the display graph.
    const visible = store.getReducedGraph()!.modules.map((m) => m.id);
    expect(visible).not.toContain("src/ui/App.tsx");
  });

  it("L1.5 reveals symbol boxes without re-layout (footprint unchanged)", async () => {
    const client: AnalysisClient = {
      analyzeProject: async () => graph,
      readModuleSource: async () => {
        throw new Error("should not fetch source at L1.5");
      },
      searchModuleSources: noSearchResults,
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
      searchModuleSources: noSearchResults,
    };
    const store = await readyStoreAtZoomLevel2(client);
    expect(store.getSourceCache().size).toBe(graph.modules.length);
    expect(store.getSourceCache().get("src/services/http.ts")).toContain(
      "source of src/services/http.ts",
    );
  });

  it("L2 lazily fetches architecture docs for groups that declare one", async () => {
    const withDoc: ProjectGraph = {
      ...graph,
      groups: graph.groups.map((g) =>
        g.id === "core"
          ? { ...g, architectureDoc: "docs/architecture/contract.md" }
          : g,
      ),
    };
    const client: AnalysisClient = {
      analyzeProject: async () => withDoc,
      readModuleSource: async (_root, path) => `# Doc for ${path}`,
      searchModuleSources: noSearchResults,
    };
    const store = await readyStoreAtZoomLevel2(client);
    expect(store.getGroupDocCache().get("core")).toContain("Doc for docs/architecture/contract.md");
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

  it("refuses L0 while a diff overlay is active", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.applyDiffFromPaste("diff --git a/src/core/store.ts b/src/core/store.ts\n");
    store.setZoomLevel(0);
    expect(store.getZoomLevel()).toBe(1);
    expect(store.getCollapsedGroupIds().size).toBe(0);
    expect(store.getReducedGraph()?.modules.length).toBe(graph.modules.length);
  });

  it("bumps L0 to L1 when entering diff mode", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    store.setZoomLevel(0);
    expect(store.getZoomLevel()).toBe(0);
    await store.applyDiffFromPaste("diff --git a/src/core/store.ts b/src/core/store.ts\n");
    expect(store.getZoomLevel()).toBe(1);
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

describe("GraphSessionStore heatmap", () => {
  it("pauses heatmap during diff overlay and restores after clear", async () => {
    const git = { ...createMockGitClient(), isGitRepo: async () => true };
    const store = new GraphSessionStore(
      clientReturning(graph),
      git,
      new ElkLayoutEngine(),
    );
    await store.loadProject("/x");
    store.setHeatmapEnabled(true);
    store.setHeatmapMode("risk");
    await store.applyDiffFromPaste("diff --git a/src/core/store.ts b/src/core/store.ts\n");
    expect(store.getHeatmapEnabled()).toBe(false);
    store.clearDiffOverlay();
    expect(store.getHeatmapEnabled()).toBe(true);
    expect(store.getHeatmapMode()).toBe("risk");
  });

  it("falls back to Instability when enabling the heatmap without git", async () => {
    const store = newStore(clientReturning(graph));
    await store.loadProject("/x");
    expect(store.getIsGitRepo()).toBe(false);
    store.setHeatmapEnabled(true);
    expect(store.getHeatmapMode()).toBe("instability");
    store.setHeatmapMode("activity");
    expect(store.getHeatmapMode()).toBe("instability");
  });
});

describe("GraphSessionStore local changes diff", () => {
  it("uses the loaded graph as after and allowlists its module paths", async () => {
    const submoduleModule = {
      ...graph.modules[0],
      id: "vendor/lib.ts",
      path: "vendor/lib.ts",
      label: "lib.ts",
    };
    const beforeGraph = { ...graph, edges: [] };
    const currentGraph = {
      ...graph,
      modules: [...graph.modules, submoduleModule],
      edges: [],
    };
    const diffWorkingTree = vi.fn(async () =>
      [
        "diff --git a/src/core/store.ts b/src/core/store.ts",
        "--- a/src/core/store.ts",
        "+++ b/src/core/store.ts",
        "@@ -1 +1 @@",
        "-old",
        "+new",
      ].join("\n"),
    );
    const listSubmodulePaths = vi.fn(async () => ["vendor"]);
    const git: GitClient = {
      isGitRepo: async () => true,
      listCommits: async () => [],
      loadProjectSnapshot: async () => ({ graph: beforeGraph, sources: {} }),
      diffRefs: async () => "",
      diffWorkingTree,
      listSubmodulePaths,
    };
    const store = new GraphSessionStore(
      clientReturning(currentGraph),
      git,
      new ElkLayoutEngine(),
    );
    await store.loadProject("/repo");

    await store.applyDiffFromWorkingTree("HEAD", /*ignoreSubmodules=*/true);

    expect(diffWorkingTree).toHaveBeenCalledWith({
      path: "/repo",
      baseRef: "HEAD",
      eligiblePaths: currentGraph.modules.map((module) => module.path),
      ignoreSubmodules: true,
    });
    expect(listSubmodulePaths).toHaveBeenCalledWith("/repo");
    expect(store.getDiffOverlay()?.affectedModuleIds.has("src/core/store.ts")).toBe(true);
    expect(store.getDiffOverlay()?.affectedModuleIds.has("vendor/lib.ts")).toBe(false);
  });

  it("keeps submodule modules when exclude submodules is off", async () => {
    const submoduleModule = {
      ...graph.modules[0],
      id: "vendor/lib.ts",
      path: "vendor/lib.ts",
      label: "lib.ts",
    };
    const beforeGraph = { ...graph, modules: graph.modules.slice(0, 1), edges: [] };
    const currentGraph = {
      ...graph,
      modules: [...beforeGraph.modules, submoduleModule],
      edges: [],
    };
    const git: GitClient = {
      isGitRepo: async () => true,
      listCommits: async () => [],
      loadProjectSnapshot: async () => ({ graph: beforeGraph, sources: {} }),
      diffRefs: async () => "",
      diffWorkingTree: async () => "",
      listSubmodulePaths: async () => ["vendor"],
    };
    const store = new GraphSessionStore(
      clientReturning(currentGraph),
      git,
      new ElkLayoutEngine(),
    );
    await store.loadProject("/repo");

    await store.applyDiffFromWorkingTree("HEAD", /*ignoreSubmodules=*/false);

    expect(store.getDiffOverlay()?.affectedModuleIds.has("vendor/lib.ts")).toBe(true);
  });

  it("does not re-layout the before graph when local changes include deletions", async () => {
    const deleted = {
      ...graph.modules[0],
      id: "src/gone.ts",
      path: "src/gone.ts",
      label: "gone.ts",
    };
    const currentGraph = { ...graph, edges: [] };
    const beforeGraph = {
      ...graph,
      modules: [...graph.modules, deleted],
      edges: [],
    };
    const git: GitClient = {
      isGitRepo: async () => true,
      listCommits: async () => [],
      loadProjectSnapshot: async () => ({ graph: beforeGraph, sources: {} }),
      diffRefs: async () => "",
      diffWorkingTree: async () =>
        [
          "diff --git a/src/gone.ts b/src/gone.ts",
          "deleted file mode 100644",
          "--- a/src/gone.ts",
          "+++ /dev/null",
        ].join("\n"),
      listSubmodulePaths: async () => [],
    };
    const layoutEngine = new ElkLayoutEngine();
    const layout = vi.spyOn(layoutEngine, "layout");
    const store = new GraphSessionStore(
      clientReturning(currentGraph),
      git,
      layoutEngine,
    );
    await store.loadProject("/repo");
    const layoutsAfterLoad = layout.mock.calls.length;

    await store.applyDiffFromWorkingTree("HEAD", /*ignoreSubmodules=*/true);

    expect(store.getDiffOverlay()?.ghostModules.some((m) => m.id === "src/gone.ts")).toBe(
      true,
    );
    expect(store.getDiffOverlay()?.beforeLayout).toBeNull();
    expect(layout.mock.calls.length).toBe(layoutsAfterLoad);
  });
});

describe("GraphSessionStore diff source snapshot", () => {
  it("loads each historical revision only once", async () => {
    const loadProjectSnapshot = vi.fn(async () => ({ graph, sources: {} }));
    const diff = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
    ].join("\n");
    const git: GitClient = {
      isGitRepo: async () => true,
      listCommits: async () => [],
      diffRefs: async () => diff,
      diffWorkingTree: async () => "",
      listSubmodulePaths: async () => [],
      loadProjectSnapshot,
    };
    const store = new GraphSessionStore(
      clientReturning(graph),
      git,
      new ElkLayoutEngine(),
    );
    await store.loadProject("/repo");

    await store.applyDiffFromCommits("A", "B");

    expect(loadProjectSnapshot).toHaveBeenCalledTimes(2);
    expect(loadProjectSnapshot).toHaveBeenNthCalledWith(1, {
      path: "/repo",
      gitRef: "A",
      modulePaths: ["src/core/store.ts"],
      hideTopLevelDotDirs: true,
    });
    expect(loadProjectSnapshot).toHaveBeenNthCalledWith(2, {
      path: "/repo",
      gitRef: "B",
      modulePaths: ["src/core/store.ts"],
      hideTopLevelDotDirs: true,
    });
  });

  it("displays the diff's after snapshot so line highlights stay aligned", async () => {
    // Live working-tree content has an extra comment prepended after the diff
    // was computed, so it is shifted by one line versus the diffed snapshot.
    const liveContent = "// added later\nkeep\nnew\n";
    const afterSnapshot = "keep\nnew\n";
    const diff = [
      "diff --git a/src/core/store.ts b/src/core/store.ts",
      "--- a/src/core/store.ts",
      "+++ b/src/core/store.ts",
      "@@ -1,2 +1,2 @@",
      " keep",
      "-old",
      "+new",
    ].join("\n");
    const git: GitClient = {
      isGitRepo: async () => true,
      listCommits: async () => [],
      loadProjectSnapshot: async ({ gitRef }) => ({
        graph,
        sources: gitRef === "B" ? { "src/core/store.ts": afterSnapshot } : {},
      }),
      diffRefs: async () => diff,
      diffWorkingTree: async () => diff,
      listSubmodulePaths: async () => [],
    };
    const client: AnalysisClient = {
      analyzeProject: async () => graph,
      readModuleSource: async () => liveContent,
      searchModuleSources: noSearchResults,
    };
    const store = new GraphSessionStore(client, git, new ElkLayoutEngine());
    await store.loadProject("/repo");

    await store.applyDiffFromCommits("A", "B");

    // Without the fix the cache would hold liveContent, shifting every
    // highlight by one line relative to the diff coordinates.
    expect(store.getSourceCache().get("src/core/store.ts")).toBe(afterSnapshot);

    store.clearDiffOverlay();
    expect(store.getSourceCache().get("src/core/store.ts")).not.toBe(afterSnapshot);
  });
});
