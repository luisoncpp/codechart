// @Architecture(descriptionShort="Stamps diff state onto projected React Flow nodes and edges")
import type { Edge, ProjectedGraph, RFEdgeT, RFNode } from "../../graph";
import type { GraphDiffOverlay } from "./types";
import { applySymbolDiffNodes } from "./apply-symbol-diff";
import { placeGhostModules } from "./place-ghost-modules";

/** Stamp diff overlay state onto projected nodes and edges. */
export function applyDiffOverlay(
  projected: ProjectedGraph,
  overlay: GraphDiffOverlay,
): ProjectedGraph {
  const stampedNodes = projected.nodes.map(stampNode(overlay));
  const showSymbols = stampedNodes.some(
    (node) => node.type === "module" && node.data.showSymbols,
  );
  const ghostNodes = placeGhostModules(overlay, showSymbols, stampedNodes);
  const nodes = applySymbolDiffNodes([...stampedNodes, ...ghostNodes], overlay);
  const edges = projected.edges.map(stampEdge(overlay));
  const removed = phantomRemovedEdges(overlay.removedEdges, projected.edges);
  return { nodes, edges: [...edges, ...removed] };
}

function stampNode(overlay: GraphDiffOverlay) {
  return (node: RFNode): RFNode => {
    if (node.type === "group") {
      return {
        ...node,
        data: { ...node.data, diffVisualizing: true },
      };
    }
    if (node.type !== "module") return node;
    const diffState = moduleDiffState(node.id, overlay);
    const path = node.data.path ?? node.id;
    const lineDiff = overlay.lineDiffByPath.get(path);
    return {
      ...node,
      data: {
        ...node.data,
        diffState,
        ...(lineDiff ? { diffLineDiff: lineDiff } : {}),
      },
    };
  };
}

function moduleDiffState(
  id: string,
  overlay: GraphDiffOverlay,
): "affected" | "deleted" | "unchanged" {
  if (overlay.deletedModuleIds.has(id)) return "deleted";
  if (overlay.affectedModuleIds.has(id)) return "affected";
  return "unchanged";
}

function stampEdge(overlay: GraphDiffOverlay) {
  return (edge: RFEdgeT): RFEdgeT => {
    if (!overlay.addedEdgeIds.has(edge.id)) return edge;
    return {
      ...edge,
      data: { ...edge.data!, diffState: "added" },
    };
  };
}

function phantomRemovedEdges(removed: Edge[], current: RFEdgeT[]): RFEdgeT[] {
  const existing = new Set(current.map((e) => e.id));
  return removed
    .filter((e) => !existing.has(e.id))
    .map((e) => removedEdge(e));
}

function removedEdge(edge: Edge): RFEdgeT {
  return {
    id: `diff-removed:${edge.id}`,
    source: edge.source,
    target: edge.target,
    type: "floating",
    data: {
      isViolation: edge.isViolation,
      kind: edge.kind,
      diffState: "removed",
    },
  };
}
