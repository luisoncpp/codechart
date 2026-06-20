import type { Node } from "@xyflow/react";
import type { GraphSessionStore } from "../../../state/graph-session";

/**
 * Thin adapter: translates React Flow canvas events into store mutations.
 * Keeps `GraphCanvas` free of selection logic (guidelines: classes over hooks).
 */
export class GraphCanvasController {
  constructor(private store: GraphSessionStore) {}

  onNodeClick(node: Node) {
    if (node.type !== "module") return;
    this.store.select(node.id);
  }

  onPaneClick() {
    this.store.select(null);
  }
}
