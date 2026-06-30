import type React from "react";
import type { Node } from "@xyflow/react";
import type { GraphSessionStore } from "../../../state/graph-session";

export class GraphCanvasNodeHandlers {
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
    this.store.select(node.id);
  }

  /** Double-click a group to collapse/expand just it (per-group override). */
  onNodeDoubleClick(node: Node) {
    if (node.type !== "group") return;
    this.store.toggleGroup(node.id);
  }

  /** Module or symbol right-click: return the module path for a context menu, else null. */
  modulePathForContextMenu(node: Node): string | null {
    if (node.type !== "module" && node.type !== "symbol") return null;
    const graph = this.store.getReducedGraph();
    if (!graph) return null;
    const moduleId = node.type === "module" ? node.id : node.parentId;
    if (!moduleId) return null;
    return graph.modules.find((m) => m.id === moduleId)?.path ?? null;
  }
}
