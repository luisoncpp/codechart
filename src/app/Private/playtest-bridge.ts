// @Architecture(descriptionShort="Dev-only playtest bridge exposed on window for MCP UI automation")
import type { ZoomLevel } from "../../domain/graph";
import type { CanvasViewportHandle } from "../../features/graph_canvas";
import type {
  InspectorSnapshot,
  PlaytestBridgeDeps,
  PlaytestNodeRect,
  PlaytestStateSnapshot,
} from "./playtest-bridge-types";

export type {
  InspectorSnapshot,
  PlaytestBridgeDeps,
  PlaytestNodeRect,
  PlaytestStateSnapshot,
} from "./playtest-bridge-types";

const ZOOM_FOR_LEVEL: Record<ZoomLevel, number> = { 0: 0.3, 1: 0.7, 1.5: 1.5, 2: 4.0 };

function settleFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function canvasCenter(): { x: number; y: number } {
  const pane = document.querySelector<HTMLElement>(".react-flow");
  if (!pane) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const rect = pane.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

export class PlaytestBridge {
  private viewport: CanvasViewportHandle | null = null;
  private inspector: InspectorSnapshot;

  constructor(private readonly deps: PlaytestBridgeDeps) {
    this.inspector = deps.inspector;
  }

  setViewportHandle = (handle: CanvasViewportHandle | null) => {
    this.viewport = handle;
  };

  updateInspector(inspector: InspectorSnapshot) {
    this.inspector = inspector;
  }

  getState(): PlaytestStateSnapshot {
    const { store, ui } = this.deps;
    const graph = store.getGraph();
    return {
      phase: store.getPhase(),
      error: store.getError(),
      projectRoot: store.getProjectRoot(),
      zoomLevel: store.getZoomLevel(),
      viewport: this.viewport ? this.viewport.getViewport() : null,
      selectedId: store.getSelectedId(),
      counts: {
        groups: graph?.groups.length ?? 0,
        modules: graph?.modules.length ?? 0,
        edges: graph?.edges.length ?? 0,
        visibleNodes: document.querySelectorAll(".react-flow__node[data-id]").length,
      },
      collapsedGroupIds: [...store.getCollapsedGroupIds()],
      diffActive: Boolean(store.getDiffOverlay()),
      diffError: store.getDiffError(),
      heatmap: {
        enabled: store.getHeatmapEnabled(),
        mode: store.getHeatmapMode(),
        metricsWindowDays: store.getMetricsWindowDays(),
      },
      findBar: { open: ui.getFindBarOpen(), mode: ui.getFindBarMode(), query: ui.getFindQuery() },
      inspector: { ...this.inspector },
      windowSize: { width: window.innerWidth, height: window.innerHeight },
    };
  }

  listNodes(): PlaytestNodeRect[] {
    const reduced = this.deps.store.getReducedGraph();
    if (!reduced) return [];
    const groupIds = new Set(reduced.groups.map((g) => g.id));
    const moduleIds = new Set(reduced.modules.map((m) => m.id));
    const nodes: PlaytestNodeRect[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]")) {
      const id = el.dataset.id ?? "";
      const kind = groupIds.has(id) ? "group" : moduleIds.has(id) ? "module" : null;
      if (!kind) continue;
      const rect = el.getBoundingClientRect();
      nodes.push({
        id,
        kind,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });
    }
    return nodes;
  }

  async loadProject(path: string): Promise<PlaytestStateSnapshot> {
    await this.deps.store.loadProject(path);
    return this.waitForReady();
  }

  async waitForReady(timeoutMs = 15_000): Promise<PlaytestStateSnapshot> {
    const { store } = this.deps;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      const phase = store.getPhase();
      if (phase === "failed") throw new Error(store.getError() ?? "Project load failed");
      if (phase === "empty") throw new Error("Project has no analyzable modules");
      if (phase === "ready" && this.viewport) {
        await settleFrames();
        return this.getState();
      }
      await new Promise((resolve) => setTimeout(/*pollReadyState*/ resolve, /*delayMs=*/ 40));
    }
    throw new Error(`Timed out waiting for ready state (phase=${store.getPhase()})`);
  }

  async focusModule(moduleId: string): Promise<PlaytestStateSnapshot> {
    await this.deps.store.focusOn(moduleId);
    await settleFrames();
    return this.getState();
  }

  async setViewport(next: { x?: number; y?: number; zoom?: number }): Promise<boolean> {
    if (!this.viewport) return false;
    const current = this.viewport.getViewport();
    const ok = await this.viewport.setViewport(
      { x: next.x ?? current.x, y: next.y ?? current.y, zoom: next.zoom ?? current.zoom },
      { duration: 0 },
    );
    await settleFrames();
    return ok;
  }

  async fitView(): Promise<boolean> {
    if (!this.viewport) return false;
    const ok = await this.viewport.fitView({ padding: 0.12, duration: 0 });
    await settleFrames();
    return ok;
  }

  async setZoomLevel(level: ZoomLevel): Promise<PlaytestStateSnapshot> {
    const targetZoom = ZOOM_FOR_LEVEL[level];
    if (this.viewport) {
      const current = this.viewport.getViewport();
      const center = canvasCenter();
      const wx = (center.x - current.x) / current.zoom;
      const wy = (center.y - current.y) / current.zoom;
      await this.viewport.setViewport(
        { x: center.x - wx * targetZoom, y: center.y - wy * targetZoom, zoom: targetZoom },
        { duration: 0 },
      );
    }
    this.deps.store.setZoomLevel(level);
    await settleFrames(/*frameCount=*/ level === 2 ? 4 : 2);
    return this.getState();
  }

  async applyDiffFromPaste(text: string): Promise<PlaytestStateSnapshot> {
    await this.deps.store.applyDiffFromPaste(text);
    await settleFrames();
    return this.getState();
  }

  clearDiffOverlay(): PlaytestStateSnapshot {
    this.deps.store.clearDiffOverlay();
    return this.getState();
  }

  async resizeWindow(width: number, height: number): Promise<{ width: number; height: number }> {
    await this.deps.devtools.setWindowSize(width, height);
    await settleFrames();
    return { width: window.innerWidth, height: window.innerHeight };
  }
}

declare global {
  interface Window {
    __codechartPlaytest?: PlaytestBridge;
  }
}
