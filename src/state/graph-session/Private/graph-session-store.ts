// @Architecture(descriptionShort="Manages the global project, layout, and selection states")
import { AnalysisClient } from "../../../ipc/analysis-client";
import {
  ProjectGraph,
  projectForZoom,
  allGroupIds,
  filterTestModules,
  isTestModule,
  defaultDisconnectedSets,
  filterDisconnectedEdges,
  isGroupDisconnected as groupIsDisconnected,
  isModuleDisconnected as moduleIsDisconnected,
  groupParentMap,
  type ZoomLevel,
} from "../../../domain/graph";
import { LayoutEngine, LayoutedGraph, LayoutOptions } from "../../../domain/layout";
import { EventEmitter } from "./event-emitter";

export type SessionPhase = "idle" | "loading" | "ready" | "failed" | "empty";

export class GraphSessionStore extends EventEmitter {
  private phase: SessionPhase = "idle";
  private graph: ProjectGraph | null = null;
  private reduced: ProjectGraph | null = null;
  private layout: LayoutedGraph | null = null;
  private error: string | null = null;
  private selectedId: string | null = null;
  private root: string | null = null;
  private zoomLevel: ZoomLevel = 1;
  private collapsedGroupIds = new Set<string>();
  private disconnectedGroupIds = new Set<string>();
  private disconnectedModuleIds = new Set<string>();
  private hideTests = false;
  private sourceCache = new Map<string, string>();
  private sourceCacheVersion = 0;
  /** Each group's footprint from the full (uncollapsed) layout, so a collapsed
   *  group keeps its own expanded size instead of shrinking. */
  private expandedGroupSizes = new Map<string, { width: number; height: number }>();
  private layoutSeq = 0;

  constructor(
    private client: AnalysisClient,
    private layoutEngine: LayoutEngine,
  ) {
    super();
  }

  getPhase = () => this.phase;
  getGraph = () => this.graph;
  getReducedGraph = () => this.reduced;
  getLayout = () => this.layout;
  getError = () => this.error;
  getSelectedId = () => this.selectedId;
  getZoomLevel = () => this.zoomLevel;
  getCollapsedGroupIds = () => this.collapsedGroupIds;
  getDisconnectedGroupIds = () => this.disconnectedGroupIds;
  getDisconnectedModuleIds = () => this.disconnectedModuleIds;
  getHideTests = () => this.hideTests;
  getSourceCache = () => this.sourceCache;
  getSourceCacheVersion = () => this.sourceCacheVersion;

  select(id: string | null) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.emit("selection-changed");
  }

  async fetchModuleSource(moduleId: string): Promise<string> {
    const cached = this.sourceCache.get(moduleId);
    if (cached !== undefined) return cached;
    if (!this.root || !this.graph) return "";
    const m = this.graph.modules.find((mod) => mod.id === moduleId);
    if (!m) return "";
    try {
      const src = await this.client.readModuleSource(this.root, m.path);
      this.sourceCache.set(moduleId, src);
      this.sourceCacheVersion++;
      return src;
    } catch {
      const fallback = `// ${m.path}`;
      this.sourceCache.set(moduleId, fallback);
      this.sourceCacheVersion++;
      return fallback;
    }
  }

  /** Switch detail level. Collapse state updates for L0; layout stays fixed (projection-only). */
  setZoomLevel(level: ZoomLevel) {
    if (level === this.zoomLevel) return;
    const prev = this.zoomLevel;
    this.zoomLevel = level;
    const isL0 = level === 0;
    this.collapsedGroupIds =
      isL0 && this.graph ? new Set(allGroupIds(this.graph)) : new Set();
    this.syncReduced();
    this.emit("zoom-changed");
    if (level === 2 && prev !== 2) {
      void this.fetchSources();
    }
  }

  collapseGroup = (id: string) => this.toggleGroup(id, /*collapse=*/ true);
  expandGroup = (id: string) => this.toggleGroup(id, /*collapse=*/ false);

  /** Hide or show test modules (re-layouts when toggled). */
  setHideTests(hide: boolean) {
    if (hide === this.hideTests) return;
    this.hideTests = hide;
    if (hide && this.selectedId && this.graph) {
      const selected = this.graph.modules.find((m) => m.id === this.selectedId);
      if (selected && isTestModule(selected.path)) {
        this.selectedId = null;
        this.emit("selection-changed");
      }
    }
    this.syncReduced();
    this.emit("view-changed");
    void this.recomputeLayout();
  }

  /** Per-group override layered on top of the level's default (TDD §8). */
  toggleGroup(id: string, collapse = !this.collapsedGroupIds.has(id)) {
    if (collapse === this.collapsedGroupIds.has(id)) return;
    if (collapse) this.collapsedGroupIds.add(id);
    else this.collapsedGroupIds.delete(id);
    this.syncReduced();
    this.emit("zoom-changed");
    void this.recomputeLayout();
  }

  toggleGroupConnection(id: string, disconnect = !this.disconnectedGroupIds.has(id)) {
    if (disconnect === this.disconnectedGroupIds.has(id)) return;
    if (disconnect) this.disconnectedGroupIds.add(id);
    else this.disconnectedGroupIds.delete(id);
    this.syncReduced();
    this.emit("view-changed");
  }

  toggleModuleConnection(id: string, disconnect = !this.disconnectedModuleIds.has(id)) {
    if (disconnect === this.disconnectedModuleIds.has(id)) return;
    if (disconnect) this.disconnectedModuleIds.add(id);
    else this.disconnectedModuleIds.delete(id);
    this.syncReduced();
    this.emit("view-changed");
  }

  isGroupDisconnected(id: string): boolean {
    if (!this.graph) return this.disconnectedGroupIds.has(id);
    return groupIsDisconnected(id, this.disconnectedGroupIds, groupParentMap(this.graph));
  }

  isModuleDisconnected(id: string): boolean {
    if (!this.graph) return this.disconnectedModuleIds.has(id);
    return moduleIsDisconnected(
      id,
      this.graph,
      this.disconnectedGroupIds,
      this.disconnectedModuleIds,
    );
  }

  async loadProject(path: string) {
    this.root = path;
    this.phase = "loading";
    this.error = null;
    this.selectedId = null;
    this.resetZoom();
    this.emit("phase-changed");

    try {
      this.graph = await this.client.analyzeProject(path);
      if (this.graph.modules.length === 0) this.phase = "empty";
      else {
        const defaults = defaultDisconnectedSets(this.graph);
        this.disconnectedGroupIds = defaults.groups;
        this.disconnectedModuleIds = defaults.modules;
        this.syncReduced();
        await this.recomputeLayout();
        this.phase = "ready";
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.phase = "failed";
    }

    this.emit("phase-changed");
  }

  private resetZoom() {
    this.zoomLevel = 1;
    this.collapsedGroupIds = new Set();
    this.disconnectedGroupIds = new Set();
    this.disconnectedModuleIds = new Set();
    this.hideTests = false;
    this.sourceCache = new Map();
    this.sourceCacheVersion = 0;
    this.expandedGroupSizes = new Map();
    this.reduced = null;
    this.layout = null;
  }

  /** Keep the reduced graph in sync before async layout catches up. */
  private syncReduced() {
    if (!this.graph) return;
    this.reduced = this.reduceForView(this.graph);
  }

  private reduceForView(graph: ProjectGraph): ProjectGraph {
    const base = this.hideTests ? filterTestModules(graph) : graph;
    const zoomed = projectForZoom(base, new Set(this.collapsedGroupIds));
    return filterDisconnectedEdges(
      zoomed,
      this.disconnectedGroupIds,
      this.disconnectedModuleIds,
    );
  }

  /** Layout graph: test filter on the full graph; L0 collapse is projection-only. */
  private reduceForLayout(graph: ProjectGraph): ProjectGraph {
    const base = this.hideTests ? filterTestModules(graph) : graph;
    if (this.zoomLevel === 0) return base;
    return projectForZoom(base, new Set(this.collapsedGroupIds));
  }

  /** Reduce for the collapse state and (re)lay it out. Guarded so a stale async
   *  result from rapid zooming never overwrites a newer one. */
  private async recomputeLayout() {
    const graph = this.graph;
    if (!graph) return;
    const seq = ++this.layoutSeq;
    const reduced = this.reduceForLayout(graph);
    if (this.zoomLevel === 2) await this.ensureSources(reduced.modules);
    const opts: LayoutOptions = {
      collapsedGroupSizes: this.expandedGroupSizes,
    };
    const layout = await this.layoutEngine.layout(reduced, opts);
    if (seq !== this.layoutSeq) return; // a newer recompute won
    this.reduced = filterDisconnectedEdges(
      reduced,
      this.disconnectedGroupIds,
      this.disconnectedModuleIds,
    );
    this.layout = layout;
    this.captureExpandedSizes(layout);
    this.emit("layout-changed");
  }

  /** L2 source fetch without a full re-layout (footprint is zoom-independent). */
  private async fetchSources() {
    const modules = this.reduced?.modules;
    if (!modules) return;
    await this.ensureSources(modules);
    this.emit("layout-changed");
  }

  /** Record group footprints from a fully-expanded layout (nothing collapsed),
   *  so later collapses can reuse each group's own expanded size. */
  private captureExpandedSizes(layout: LayoutedGraph) {
    if (this.collapsedGroupIds.size > 0) return; // only trust a full layout
    for (const g of layout.groups) {
      this.expandedGroupSizes.set(g.id, { width: g.width, height: g.height });
    }
  }

  /** Lazily fetch + cache source for the visible modules (L2 snippets). */
  private async ensureSources(modules: ProjectGraph["modules"]) {
    if (!this.root) return;
    const missing = modules.filter((m) => !this.sourceCache.has(m.id));
    if (missing.length === 0) return;
    await Promise.all(
      missing.map(async (m) => {
        try {
          this.sourceCache.set(m.id, await this.client.readModuleSource(this.root!, m.path));
        } catch {
          this.sourceCache.set(m.id, `// ${m.path}`);
        }
      }),
    );
    this.sourceCacheVersion++;
  }
}
