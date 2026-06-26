// @Architecture(descriptionShort="Handles canvas zoom, pan, and click events")
import type React from "react";
import type { Node } from "@xyflow/react";
import { levelFromZoom } from "../../../domain/graph";
import type { GraphSessionStore } from "../../../state/graph-session";

/**
 * Thin adapter: translates React Flow canvas events into store mutations.
 * Keeps `GraphCanvas` free of selection logic (guidelines: classes over hooks).
 */
export class GraphCanvasController {
  constructor(
    private store: GraphSessionStore,
    private onSymbolClick?: (node: Node, event: React.MouseEvent) => void,
  ) {}

  onNodeClick(node: Node, event: React.MouseEvent) {
    if ((event.target as HTMLElement).closest("[data-connection-toggle]")) {
      if (node.type === "group") this.store.toggleGroupConnection(node.id);
      else if (node.type === "module") this.store.toggleModuleConnection(node.id);
      return;
    }
    if (node.type === "symbol") {
      this.store.select(node.parentId ?? null);
      this.onSymbolClick?.(node, event);
      return;
    }
    if (node.type === "module") {
      this.store.select(node.id);
      return;
    }
    if (node.type !== "group") return;
    // The header's collapse/expand button: single-click toggles just this group.
    if ((event.target as HTMLElement).closest("[data-group-toggle]")) {
      this.store.toggleGroup(node.id);
      return;
    }
    // Collapsed groups are edge endpoints (L0 overview); select like a module.
    if (node.data?.collapsed) this.store.select(node.id);
  }

  /** Double-click a group to collapse/expand just it (per-group override). */
  onNodeDoubleClick(node: Node) {
    if (node.type !== "group") return;
    this.store.toggleGroup(node.id);
  }

  onPaneClick() {
    this.store.select(null);
  }

  /** Scroll-zoom drives the discrete detail level (guarded against no-ops). */
  onViewportZoom(zoom: number) {
    this.store.setZoomLevel(levelFromZoom(zoom));
  }
}
