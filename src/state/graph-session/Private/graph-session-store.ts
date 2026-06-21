import { AnalysisClient } from "../../../ipc/analysis-client";
import {
  ProjectGraph,
  projectForZoom,
  topLevelGroupIds,
  type ZoomLevel,
} from "../../../domain/graph";
import { LayoutEngine, LayoutedGraph, LayoutOptions } from "../../../domain/layout";
import { EventEmitter } from "./event-emitter";

export type SessionPhase = "idle" | "loading" | "ready" | "failed" | "empty";

/** Larger module boxes at L2 so a source snippet fits. */
const L2_LAYOUT: LayoutOptions = { moduleWidth: 260, moduleHeight: 168 };

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

  /** Switch detail level: re-seed the default collapse set, then re-layout. */
  setZoomLevel(level: ZoomLevel) {
    if (level === this.zoomLevel) return;
    this.zoomLevel = level;
    this.collapsedGroupIds =
      level === 0 && this.graph
        ? new Set(topLevelGroupIds(this.graph))
        : new Set();
    this.emit("zoom-changed");
    void this.recomputeLayout();
  }

  collapseGroup = (id: string) => this.toggleGroup(id, /*collapse=*/ true);
  expandGroup = (id: string) => this.toggleGroup(id, /*collapse=*/ false);

  /** Per-group override layered on top of the level's default (TDD §8). */
  toggleGroup(id: string, collapse = !this.collapsedGroupIds.has(id)) {
    if (collapse === this.collapsedGroupIds.has(id)) return;
    if (collapse) this.collapsedGroupIds.add(id);
    else this.collapsedGroupIds.delete(id);
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
    this.reduced = null;
    this.layout = null;
  }

  /** Reduce for the collapse state and (re)lay it out. Guarded so a stale async
   *  result from rapid zooming never overwrites a newer one. */
  private async recomputeLayout() {
    const graph = this.graph;
    if (!graph) return;
    const seq = ++this.layoutSeq;
    const reduced = projectForZoom(graph, new Set(this.collapsedGroupIds));
    if (this.zoomLevel === 2) await this.ensureSources(reduced.modules);
    const opts = this.zoomLevel === 2 ? L2_LAYOUT : undefined;
    const layout = await this.layoutEngine.layout(reduced, opts);
    if (seq !== this.layoutSeq) return; // a newer recompute won
    this.reduced = reduced;
    this.layout = layout;
    this.emit("layout-changed");
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
