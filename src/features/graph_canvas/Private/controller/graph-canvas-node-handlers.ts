import type React from "react";
import type { Node } from "@xyflow/react";
import type { GraphSessionStore } from "../../../../state/graph-session";

export interface ModuleContextTarget {
  moduleId: string;
  modulePath: string;
  color: string;
}

function clickedIn(event: React.MouseEvent, selector: string): boolean {
  return (event.target as HTMLElement).closest(selector) !== null;
}

export class GraphCanvasNodeHandlers {
  constructor(
    private store: GraphSessionStore,
    private onSymbolClick?: (node: Node, event: React.MouseEvent) => void,
    private onReviewNoteClick?: (node: Node) => void,
  ) {}

  onNodeClick(node: Node, event: React.MouseEvent) {
    if (clickedIn(event, "[data-review-note-badge]")) {
      this.onReviewNoteClick?.(node);
      return;
    }
    if (clickedIn(event, "[data-connection-toggle]")) {
      this.toggleConnection(node);
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
    if (node.type === "group") this.clickGroup(node, event);
  }

  /** Double-click a group to collapse/expand just it (per-group override). */
  onNodeDoubleClick(node: Node) {
    if (node.type !== "group") return;
    this.store.toggleGroup(node.id);
  }

  /** Module or symbol right-click: resolve its parent module for context actions. */
  moduleForContextMenu(node: Node): ModuleContextTarget | null {
    if (node.type !== "module" && node.type !== "symbol") return null;
    const moduleId = node.type === "module" ? node.id : node.parentId;
    if (!moduleId) return null;
    const module = this.store.getReducedGraph()?.modules.find((m) => m.id === moduleId);
    if (!module) return null;
    return {
      moduleId,
      modulePath: module.path,
      color: typeof node.data?.color === "string" ? node.data.color : "#64748b",
    };
  }

  private toggleConnection(node: Node) {
    if (node.type === "group") this.store.toggleGroupConnection(node.id);
    if (node.type === "module") this.store.toggleModuleConnection(node.id);
  }

  private clickGroup(node: Node, event: React.MouseEvent) {
    if (clickedIn(event, "[data-group-toggle]")) {
      this.store.toggleGroup(node.id);
      return;
    }
    this.store.select(node.id);
  }
}
