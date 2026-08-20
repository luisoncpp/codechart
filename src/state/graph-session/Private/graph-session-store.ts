// @Architecture(descriptionShort="Manages the global project, layout, and selection states")
import {
  AnalysisClient,
  DEFAULT_METRICS_WINDOW_DAYS,
  ProjectSearchResult,
} from "../../../ipc/analysis-client";
import { GitClient } from "../../../ipc/git-client";
import type { DiffReviewClient } from "../../../ipc/diff-review-client";
import type { GraphDiffOverlay } from "../../../domain/diff";
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
  type HeatmapMode,
} from "../../../domain/graph";
import { LayoutEngine, LayoutedGraph, LayoutOptions } from "../../../domain/layout";
import { EventEmitter } from "./event-emitter";
import {
  buildCommitDiffOverlay,
  buildPasteDiffOverlay,
  buildWorkingTreeDiffOverlay,
} from "./build-diff-overlay";
import {
  expandCollapsedAncestors,
  expandCollapsedGroupAncestors,
  uncollapseGroupAndAncestors,
} from "./ensure-node-visible";
import { SelectionHistory } from "./selection-history";
import { FileSourceCache } from "./file-source-cache";
import { DiffReviewTracker } from "./diff-review-tracker";
import { commitDiffId, pasteDiffId, workingTreeDiffId } from "./diff-review-id";

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
  /** Session-only: exclude top-level `.*` dirs from analysis (default on). */
  private hideDotDirectories = true;
  private sourceCache = new Map<string, string>();
  private sourceCacheVersion = 0;
  private groupDocCache = new Map<string, string>();
  private groupDocCacheVersion = 0;
  /** Non-module project files opened by path (wiki-link destinations). */
  private fileSources = new FileSourceCache(
    /*read=*/ (path) => this.client.readModuleSource(this.root ?? "", path),
  );
  /** Each group's footprint from the full (uncollapsed) layout, so a collapsed
   *  group keeps its own expanded size instead of shrinking. */
  private expandedGroupSizes = new Map<string, { width: number; height: number }>();
  private layoutSeq = 0;
  private diffOverlay: GraphDiffOverlay | null = null;
  private diffError: string | null = null;
  private diffNotesWarningClosed = false;
  /** Module ids whose sourceCache was overridden by the active diff snapshot. */
  private diffSourceIds = new Set<string>();
  private heatmapEnabled = false;
  private heatmapMode: HeatmapMode = "activity";
  private metricsWindowDays = DEFAULT_METRICS_WINDOW_DAYS;
  private isGitRepo: boolean | null = null;
  private heatmapSaved: { enabled: boolean; mode: HeatmapMode } | null = null;
  private focusRequestId: string | null = null;
  private focusSeq = 0;
  private selectionHistory = new SelectionHistory();
  /** Reviewed-file marks for the active diff (persisted per project+diff). */
  private diffReview: DiffReviewTracker;

  constructor(
    private client: AnalysisClient,
    private git: GitClient,
    private layoutEngine: LayoutEngine,
    diffReviewClient?: DiffReviewClient,
  ) {
    super();
    this.diffReview = new DiffReviewTracker(diffReviewClient);
  }

  getPhase = () => this.phase;
  getGraph = () => this.graph;
  getReducedGraph = () => this.reduced;
  getLayout = () => this.layout;
  getError = () => this.error;
  getSelectedId = () => this.selectedId;
  canGoBack = () => this.selectionHistory.canGoBack;
  canGoForward = () => this.selectionHistory.canGoForward;
  getZoomLevel = () => this.zoomLevel;
  getCollapsedGroupIds = () => this.collapsedGroupIds;
  getDisconnectedGroupIds = () => this.disconnectedGroupIds;
  getDisconnectedModuleIds = () => this.disconnectedModuleIds;
  getHideTests = () => this.hideTests;
  getHideDotDirectories = () => this.hideDotDirectories;
  getSourceCache = () => this.sourceCache;
  getSourceCacheVersion = () => this.sourceCacheVersion;
  getGroupDocCache = () => this.groupDocCache;
  getGroupDocCacheVersion = () => this.groupDocCacheVersion;
  getProjectRoot = () => this.root;
  getDiffOverlay = () => this.diffOverlay;
  getDiffError = () => this.diffError;
  getDiffReviewedIds = () => this.diffReview.getReviewed();
  getDiffReviewError = () => this.diffReview.getError();
  getDiffNotesWarningClosed = () => this.diffNotesWarningClosed;

  closeDiffNotesWarning() {
    if (this.diffNotesWarningClosed) return;
    this.diffNotesWarningClosed = true;
    this.emit("diff-changed");
  }

  /** Flip a module's reviewed mark for the active diff (persisted). */
  toggleDiffReviewed(moduleId: string) {
    if (this.diffReview.toggle(moduleId) === null) return;
    this.emit("diff-changed");
  }

  /** Unmark every reviewed file of the active diff (persisted; useful to restart a review). */
  unmarkAllDiffReviewed() {
    if (this.diffReview.unmarkAll() === null) return;
    this.emit("diff-changed");
  }

  /** Wipe every persisted diff review entry (all diffs) and the active marks. Throws on save failure. */
  async clearAllDiffReviews() {
    if (!(await this.diffReview.clearAll())) return;
    this.emit("diff-changed");
  }
  getHeatmapEnabled = () => this.heatmapEnabled;
  getHeatmapMode = () => this.heatmapMode;
  getMetricsWindowDays = () => this.metricsWindowDays;
  getIsGitRepo = () => this.isGitRepo;
  getFocusRequest = () =>
    this.focusRequestId === null
      ? null
      : { id: this.focusRequestId, seq: this.focusSeq };

  clearDiffOverlay() {
    if (!this.diffOverlay && !this.diffError) return;
    this.diffOverlay = null;
    this.diffError = null;
    this.diffNotesWarningClosed = false;
    this.diffReview.clear();
    this.restoreDiffSources();
    this.restoreHeatAfterDiff();
    this.emit("diff-changed");
  }

  /** Load persisted review marks for the freshly applied diff overlay. */
  private async activateDiffReview(reviewId: string) {
    const overlay = this.diffOverlay;
    if (!overlay || !this.root) return;
    const paths = new Set([...overlay.affectedModuleIds, ...overlay.deletedModuleIds]);
    await this.diffReview.activate(this.root, reviewId, paths);
  }

  /**
   * Diff line highlights index the after-snapshot, so the L2 code panel and
   * symbol widget must render that exact source. Override the cache for diffed
   * paths (keyed by module id = path) while the overlay is active; drop the
   * overrides on clear so the live file is re-read.
   */
  private applyDiffSources(overlay: GraphDiffOverlay) {
    this.restoreDiffSources();
    if (!this.graph) return;
    const byPath = new Map(this.graph.modules.map((m) => [m.path, m.id]));
    for (const [path, source] of overlay.afterSourceByPath) {
      const id = byPath.get(path);
      if (!id) continue;
      this.sourceCache.set(id, source);
      this.diffSourceIds.add(id);
    }
    if (this.diffSourceIds.size > 0) this.sourceCacheVersion++;
  }

  private restoreDiffSources() {
    if (this.diffSourceIds.size === 0) return;
    for (const id of this.diffSourceIds) this.sourceCache.delete(id);
    this.diffSourceIds.clear();
    this.sourceCacheVersion++;
  }

  setHeatmapEnabled(enabled: boolean) {
    if (enabled === this.heatmapEnabled || this.diffOverlay) return;
    this.heatmapEnabled = enabled;
    this.emit("heatmap-changed");
  }

  setHeatmapMode(mode: HeatmapMode) {
    if (mode === this.heatmapMode || this.diffOverlay) return;
    this.heatmapMode = mode;
    this.emit("heatmap-changed");
  }

  async setMetricsWindowDays(days: number) {
    if (!Number.isInteger(days) || days < 1) {
      throw new Error("Enter a whole number of at least 1 day.");
    }
    if (days === this.metricsWindowDays) return;
    if (!this.root) throw new Error("Open a project before changing the timeframe.");
    const previousGraph = this.graph;
    const graph = await this.client.analyzeProject(this.root, this.analyzeOptions(days));
    this.graph = graph;
    this.syncReduced();
    try {
      await this.recomputeLayout();
    } catch (cause) {
      this.graph = previousGraph;
      this.syncReduced();
      throw cause;
    }
    this.metricsWindowDays = days;
    this.emit("heatmap-changed");
  }

  async applyDiffFromCommits(baseRef: string, headRef: string) {
    if (!this.root || !this.graph) return;
    this.diffError = null;
    this.diffNotesWarningClosed = false;
    try {
      this.diffOverlay = await buildCommitDiffOverlay({
        git: this.git,
        layoutEngine: this.layoutEngine,
        root: this.root,
        baseRef,
        headRef,
        hideTopLevelDotDirs: this.hideDotDirectories,
      });
      this.applyDiffSources(this.diffOverlay);
      await this.activateDiffReview(commitDiffId(baseRef, headRef));
      this.pauseHeatForDiff();
      this.ensureDiffZoomFloor();
      this.emit("diff-changed");
    } catch (e) {
      this.diffError = e instanceof Error ? e.message : String(e);
      this.emit("diff-changed");
    }
  }

  async applyDiffFromWorkingTree(baseRef: string, ignoreSubmodules = true) {
    if (!this.root || !this.graph) return;
    this.diffError = null;
    this.diffNotesWarningClosed = false;
    try {
      this.diffOverlay = await buildWorkingTreeDiffOverlay({
        client: this.client,
        git: this.git,
        root: this.root,
        baseRef,
        current: this.graph,
        hideTopLevelDotDirs: this.hideDotDirectories,
        ignoreSubmodules,
      });
      this.applyDiffSources(this.diffOverlay);
      await this.activateDiffReview(workingTreeDiffId(baseRef));
      this.pauseHeatForDiff();
      this.ensureDiffZoomFloor();
      this.emit("diff-changed");
    } catch (e) {
      this.diffError = e instanceof Error ? e.message : String(e);
      this.emit("diff-changed");
    }
  }

  async applyDiffFromPaste(text: string) {
    if (!this.graph) return;
    this.diffError = null;
    this.diffNotesWarningClosed = false;
    this.diffOverlay = buildPasteDiffOverlay(text, this.graph);
    await this.activateDiffReview(pasteDiffId(text));
    this.pauseHeatForDiff();
    this.ensureDiffZoomFloor();
    this.emit("diff-changed");
  }

  select(id: string | null) {
    if (this.selectedId === id) return;
    this.selectedId = id;
    if (id) this.selectionHistory.push(id);
    this.emit("selection-changed");
  }

  goBack = () => this.navigateHistory(/*forward=*/false);
  goForward = () => this.navigateHistory(/*forward=*/true);

  /** Select a module and ask the canvas to center on it (inspector import navigation). */
  async focusOn(moduleId: string) {
    const isLive = Boolean(this.graph?.modules.some((m) => m.id === moduleId));
    const ghostMod = this.diffOverlay?.ghostModules.find((m) => m.id === moduleId);
    const isDeleted = Boolean(this.diffOverlay?.deletedModuleIds.has(moduleId) || ghostMod);
    if (!isLive && !isDeleted) return;
    if (this.graph) {
      const expanded = isLive
        ? expandCollapsedAncestors(this.graph, moduleId, this.collapsedGroupIds)
        : ghostMod?.groupId
          ? uncollapseGroupAndAncestors(this.graph, ghostMod.groupId, this.collapsedGroupIds)
          : false;
      if (expanded) {
        this.syncReduced();
        this.emit("zoom-changed");
        await this.recomputeLayout();
      }
    }
    const selChanged = this.selectedId !== moduleId;
    this.selectedId = moduleId;
    this.selectionHistory.push(moduleId);
    if (selChanged) this.emit("selection-changed");
    this.focusRequestId = moduleId;
    this.focusSeq++;
    this.emit("focus-requested");
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

  /**
   * Read any project-relative file, module or not (a wiki-link destination).
   * Null means the file could not be read.
   */
  async fetchFileSource(path: string): Promise<string | null> {
    if (!this.root) return null;
    return this.fileSources.get(path);
  }

  /**
   * Search the visible modules' sources (test modules excluded while hidden,
   * so every result is navigable). Results are returned, never stored: the
   * find bar keeps them locally so searching never re-renders the canvas.
   */
  async searchProjectSources(query: string): Promise<ProjectSearchResult> {
    if (!this.root || !this.graph) return { matches: [], truncated: false };
    const scope = this.hideTests ? filterTestModules(this.graph) : this.graph;
    const paths = scope.modules.map((m) => m.path);
    return this.client.searchModuleSources(this.root, query, paths);
  }

  /**
   * "Go to file": case-insensitive substring match over the visible modules'
   * file names (not paths, not content). Pure and synchronous — no IPC.
   */
  searchModuleFiles(query: string): string[] {
    if (!this.graph) return [];
    const scope = this.hideTests ? filterTestModules(this.graph) : this.graph;
    const needle = query.toLowerCase();
    return scope.modules
      .map((m) => m.path)
      .filter((path) => fileName(path).toLowerCase().includes(needle));
  }

  /** "Go to symbol": case-insensitive substring match over exported names. */
  searchExportedSymbols(query: string): string[] {
    if (!this.graph) return [];
    const scope = this.hideTests ? filterTestModules(this.graph) : this.graph;
    const needle = query.toLowerCase();
    return scope.modules
      .filter((module) =>
        module.exportedSymbols.some((symbol) => symbol.toLowerCase().includes(needle)),
      )
      .map((module) => module.path);
  }

  /** Switch detail level. Collapse state updates for L0; layout stays fixed (projection-only). */
  setZoomLevel(level: ZoomLevel) {
    if (this.diffOverlay && level === 0) level = 1;
    if (level === this.zoomLevel) return;
    const prev = this.zoomLevel;
    this.zoomLevel = level;
    const isL0 = level === 0;
    this.collapsedGroupIds =
      isL0 && this.graph ? new Set(allGroupIds(this.graph)) : new Set();
    this.syncReduced();
    this.emit("zoom-changed");
    if (level === 2 && prev !== 2) {
      void this.fetchL2Assets();
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

  /** Re-analyze with/without top-level `.*` directories (session-only; default on). */
  async setHideDotDirectories(hide: boolean) {
    if (hide === this.hideDotDirectories) return;
    this.hideDotDirectories = hide;
    this.emit("view-changed");
    if (this.root) await this.loadProject(this.root);
  }

  /** Per-group override layered on top of the level's default (TDD §8).
   *  Expanding also expands the ancestor chain, otherwise a nested group's
   *  contents stay hidden under a still-collapsed parent (the L0 default). */
  toggleGroup(id: string, collapse = !this.collapsedGroupIds.has(id)) {
    if (collapse === this.collapsedGroupIds.has(id)) return;
    if (collapse) this.collapsedGroupIds.add(id);
    else {
      this.collapsedGroupIds.delete(id);
      if (this.graph) {
        expandCollapsedGroupAncestors(this.graph, id, this.collapsedGroupIds);
      }
    }
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
    if (this.root !== path) this.metricsWindowDays = DEFAULT_METRICS_WINDOW_DAYS;
    this.root = path;
    this.phase = "loading";
    this.error = null;
    this.selectedId = null;
    this.selectionHistory.clear();
    this.resetZoom();
    this.diffOverlay = null;
    this.diffError = null;
    this.diffSourceIds.clear();
    this.diffReview.clear();
    this.heatmapSaved = null;
    this.isGitRepo = null;
    this.heatmapEnabled = false;
    this.heatmapMode = "activity";
    this.emit("phase-changed");

    try {
      this.isGitRepo = await this.git.isGitRepo(path);
      this.graph = await this.client.analyzeProject(path, this.analyzeOptions(this.metricsWindowDays));
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
    this.heatmapEnabled = false;
    this.heatmapMode = "activity";
    this.heatmapSaved = null;
    this.sourceCache = new Map();
    this.sourceCacheVersion = 0;
    this.groupDocCache = new Map();
    this.groupDocCacheVersion = 0;
    this.fileSources.clear();
    this.expandedGroupSizes = new Map();
    this.reduced = null;
    this.layout = null;
  }

  private async navigateHistory(forward: boolean) {
    const id = forward
      ? this.selectionHistory.forward()
      : this.selectionHistory.back();
    if (!id) return;
    await this.focusSelection(id);
  }

  private async focusSelection(id: string) {
    if (!this.graph) return;
    const isModule = this.graph.modules.some((module) => module.id === id);
    const isGroup = this.graph.groups.some((group) => group.id === id);
    if (!isModule && !isGroup) return;
    if (isModule) await this.expandForFocus(id);
    this.selectedId = id;
    this.emit("selection-changed");
    this.focusRequestId = id;
    this.focusSeq++;
    this.emit("focus-requested");
  }

  private async expandForFocus(moduleId: string) {
    if (!this.graph) return;
    const expanded = expandCollapsedAncestors(
      this.graph,
      moduleId,
      this.collapsedGroupIds,
    );
    if (!expanded) return;
    this.syncReduced();
    this.emit("zoom-changed");
    await this.recomputeLayout();
  }

  /** Keep the reduced graph in sync before async layout catches up. */
  private syncReduced() {
    if (!this.graph) return;
    this.reduced = this.reduceForView(this.graph);
  }

  private analyzeOptions(metricsWindowDays: number) {
    return {
      metricsWindowDays,
      hideTopLevelDotDirs: this.hideDotDirectories,
    };
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
    // The display graph is always the *view* reduction — at L0 the layout graph
    // is the full one (collapse is projection-only there), so reusing it would
    // drop the group→group edge aggregation.
    this.reduced = this.reduceForView(graph);
    this.layout = layout;
    this.captureExpandedSizes(layout);
    this.emit("layout-changed");
  }

  /** Diff mode needs module boxes visible — never stay at L0 bird's-eye. */
  private ensureDiffZoomFloor() {
    if (this.zoomLevel === 0) this.setZoomLevel(1);
  }

  /** L2 source/doc fetch without a full re-layout (footprint is zoom-independent). */
  private async fetchL2Assets() {
    const modules = this.reduced?.modules;
    const groups = this.reduced?.groups;
    if (!modules && !groups) return;
    await Promise.all([
      modules ? this.ensureSources(modules) : Promise.resolve(),
      groups ? this.ensureGroupDocs(groups) : Promise.resolve(),
    ]);
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

  /** Lazily fetch + cache architecture markdown for visible groups (L2). */
  private async ensureGroupDocs(groups: ProjectGraph["groups"]) {
    if (!this.root) return;
    const pending = groups.filter(
      (g) => g.architectureDoc && !this.groupDocCache.has(g.id),
    );
    if (pending.length === 0) return;
    await Promise.all(
      pending.map(async (g) => {
        const path = g.architectureDoc!;
        try {
          this.groupDocCache.set(
            g.id,
            await this.client.readModuleSource(this.root!, path),
          );
        } catch {
          this.groupDocCache.set(g.id, `_Could not load \`${path}\`._`);
        }
      }),
    );
    this.groupDocCacheVersion++;
  }

  private pauseHeatForDiff() {
    this.heatmapSaved = { enabled: this.heatmapEnabled, mode: this.heatmapMode };
    this.heatmapEnabled = false;
    this.emit("heatmap-changed");
  }

  private restoreHeatAfterDiff() {
    if (!this.heatmapSaved) return;
    this.heatmapEnabled = this.heatmapSaved.enabled;
    this.heatmapMode = this.heatmapSaved.mode;
    this.heatmapSaved = null;
    this.emit("heatmap-changed");
  }
}

/** Last segment of a repo-relative path (module paths always use `/`). */
function fileName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
