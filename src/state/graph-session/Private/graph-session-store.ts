// @Architecture(descriptionShort="Manages the global project, layout, and selection states")
import { AnalysisClient } from "../../../ipc/analysis-client";
import {
  ProjectGraph,
  projectForZoom,
  allGroupIds,
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
  private sourceCache = new Map<string, string>();
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
  getSourceCache = () => this.sourceCache;

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
      return src;
    } catch {
      const fallback = `// ${m.path}`;
      this.sourceCache.set(moduleId, fallback);
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

  /** Per-group override layered on top of the level's default (TDD §8). */
  toggleGroup(id: string, collapse = !this.collapsedGroupIds.has(id)) {
    if (collapse === this.collapsedGroupIds.has(id)) return;
    if (collapse) this.collapsedGroupIds.add(id);
    else this.collapsedGroupIds.delete(id);
    this.syncReduced();
    this.emit("zoom-changed");
    void this.recomputeLayout();
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
    this.sourceCache = new Map();
    this.expandedGroupSizes = new Map();
    this.reduced = null;
    this.layout = null;
  }

  /** Keep the reduced graph in sync before async layout catches up. */
  private syncReduced() {
    if (!this.graph) return;
    this.reduced = projectForZoom(this.graph, new Set(this.collapsedGroupIds));
  }

  /** Reduce for the collapse state and (re)lay it out. Guarded so a stale async
   *  result from rapid zooming never overwrites a newer one. */
  private async recomputeLayout() {
    const graph = this.graph;
    if (!graph) return;
    const seq = ++this.layoutSeq;
    const reduced = projectForZoom(graph, new Set(this.collapsedGroupIds));
    if (this.zoomLevel === 2) await this.ensureSources(reduced.modules);
    const opts: LayoutOptions = {
      collapsedGroupSizes: this.expandedGroupSizes,
    };
    const layout = await this.layoutEngine.layout(reduced, opts);
    if (seq !== this.layoutSeq) return; // a newer recompute won
    this.reduced = reduced;
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
    await Promise.all(
      missing.map(async (m) => {
        try {
          this.sourceCache.set(m.id, await this.client.readModuleSource(this.root!, m.path));
        } catch {
          this.sourceCache.set(m.id, `// ${m.path}`);
        }
      }),
    );
  }
}
