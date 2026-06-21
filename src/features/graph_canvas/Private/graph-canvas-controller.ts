import type { Node } from "@xyflow/react";
import { levelFromZoom } from "../../../domain/graph";
import type { GraphSessionStore } from "../../../state/graph-session";

/**
 * Thin adapter: translates React Flow canvas events into store mutations.
 * Keeps `GraphCanvas` free of selection logic (guidelines: classes over hooks).
 */
export class GraphCanvasController {
  constructor(private store: GraphSessionStore) {}

  onNodeClick(node: Node) {
    if (node.type === "symbol") {
      this.store.select(node.parentId ?? null);
      return;
    }
    if (node.type === "module") {
      this.store.select(node.id);
      return;
    }
    // Collapsed groups are edge endpoints (L0 overview); select like a module.
    if (node.type === "group" && node.data?.collapsed) {
      this.store.select(node.id);
    }
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
