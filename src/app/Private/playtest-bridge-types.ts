// @Architecture(descriptionShort="Types for the dev-only window playtest bridge")
import type { ZoomLevel } from "../../domain/graph";
import type { CanvasUiState } from "../../features/graph_canvas";
import type { DevtoolsClient } from "../../ipc/devtools-client";
import type { GraphSessionStore, SessionPhase } from "../../state/graph-session";

export interface InspectorSnapshot {
  open: boolean;
  width: number;
  activeTab: "inspector" | "review-notes";
}

export interface PlaytestStateSnapshot {
  phase: SessionPhase;
  error: string | null;
  projectRoot: string | null;
  zoomLevel: ZoomLevel;
  viewport: { x: number; y: number; zoom: number } | null;
  selectedId: string | null;
  counts: { groups: number; modules: number; edges: number; visibleNodes: number };
  collapsedGroupIds: string[];
  diffActive: boolean;
  diffError: string | null;
  heatmap: { enabled: boolean; mode: string; metricsWindowDays: number };
  findBar: { open: boolean; mode: string; query: string };
  inspector: InspectorSnapshot;
  windowSize: { width: number; height: number };
}

export interface PlaytestNodeRect {
  id: string;
  kind: "group" | "module";
  rect: { x: number; y: number; width: number; height: number };
}

export interface PlaytestBridgeDeps {
  store: GraphSessionStore;
  ui: CanvasUiState;
  devtools: DevtoolsClient;
  inspector: InspectorSnapshot;
}
