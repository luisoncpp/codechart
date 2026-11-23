// @Architecture(descriptionShort="Shared TypeScript types for the Codechart Playtest MCP server")

export interface CdpTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export interface ConsoleEntry {
  timestamp: string;
  source: "console" | "exception" | "log";
  level: string;
  text: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface PointTarget {
  x?: number;
  y?: number;
  selector?: string;
  text?: string;
}

export interface ClickOptions extends PointTarget {
  button?: "left" | "right" | "middle";
  clickCount?: number;
  modifiers?: string[];
}

export interface DragOptions {
  fromX?: number;
  fromY?: number;
  fromSelector?: string;
  toX?: number;
  toY?: number;
  toSelector?: string;
  steps?: number;
}

export interface WheelOptions extends PointTarget {
  deltaX?: number;
  deltaY?: number;
  steps?: number;
}

export interface TypeTextOptions extends PointTarget {
  value: string;
  clearFirst?: boolean;
}

export interface QueryDomOptions {
  selector: string;
  limit?: number;
  visibleOnly?: boolean;
}

export interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
}

export interface ScreenshotOptions {
  selector?: string;
  clip?: ClipRect;
  fullPage?: boolean;
  savePath?: string;
}

export interface LaunchOptions {
  projectPath?: string;
  width?: number;
  height?: number;
  cdpPort?: number;
  timeoutMs?: number;
  waitForReady?: boolean;
}

export type BridgeActionName =
  | "open_project"
  | "wait_for_ready"
  | "focus_module"
  | "set_viewport"
  | "fit_view"
  | "set_zoom_level"
  | "apply_diff_paste"
  | "clear_diff"
  | "resize_window"
  | "list_nodes";

export interface BridgeActionArgs {
  path?: string;
  timeoutMs?: number;
  moduleId?: string;
  x?: number;
  y?: number;
  zoom?: number;
  zoomLevel?: 0 | 1 | 1.5 | 2;
  diffText?: string;
  width?: number;
  height?: number;
}
