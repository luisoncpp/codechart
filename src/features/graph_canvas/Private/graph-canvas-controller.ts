// @Architecture(descriptionShort="Handles canvas zoom, pan, and click events")
import type React from "react";
import type { Node } from "@xyflow/react";
import type { GraphSessionStore } from "../../../state/graph-session";
import { GraphCanvasNodeHandlers } from "./graph-canvas-node-handlers";
import { GraphCanvasViewportHandlers } from "./graph-canvas-viewport-handlers";

/**
 * Thin adapter: translates React Flow canvas events into store mutations.
 * Keeps `GraphCanvas` free of selection logic (guidelines: classes over hooks).
 */
export class GraphCanvasController {
  private readonly nodes: GraphCanvasNodeHandlers;
  private readonly viewport: GraphCanvasViewportHandlers;

  constructor(
    store: GraphSessionStore,
    onSymbolClick?: (node: Node, event: React.MouseEvent) => void,
  ) {
    this.nodes = new GraphCanvasNodeHandlers(store, onSymbolClick);
    this.viewport = new GraphCanvasViewportHandlers(store);
  }

  onNodeClick(node: Node, event: React.MouseEvent) {
    this.nodes.onNodeClick(node, event);
  }

  onNodeDoubleClick(node: Node) {
    this.nodes.onNodeDoubleClick(node);
  }

  modulePathForContextMenu(node: Node): string | null {
    return this.nodes.modulePathForContextMenu(node);
  }

  onPaneClick() {
    this.viewport.onPaneClick();
  }

  onViewportZoom(zoom: number) {
    this.viewport.onViewportZoom(zoom);
  }
}
