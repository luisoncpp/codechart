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
  const removed = phantomDiffEdges(overlay.removedEdges, edges, /*diffState=*/ "removed");
  const added = phantomDiffEdges(overlay.addedEdges ?? [], edges, /*diffState=*/ "added");
  const renamed = phantomRenameEdges(overlay.renamePairs ?? [], edges);
  return { nodes, edges: [...edges, ...removed, ...added, ...renamed] };
}

function stampNode(overlay: GraphDiffOverlay) {
  return (node: RFNode): RFNode => {
    if (node.type === "group") {
      return { ...node, data: { ...node.data, diffVisualizing: true } };
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
  const removedEdgeIds = new Set(overlay.removedEdges.map((e) => e.id));
  const removedPairs = new Set(
    overlay.removedEdges.map((e) => `${e.source}->${e.target}`),
  );
  const addedPairs = new Set(
    (overlay.addedEdges ?? []).map((e) => `${e.source}->${e.target}`),
  );
  return (edge: RFEdgeT): RFEdgeT => {
    const pair = `${edge.source}->${edge.target}`;
    if (overlay.addedEdgeIds.has(edge.id) || addedPairs.has(pair)) {
      return { ...edge, data: { ...edge.data!, diffState: "added" } };
    }
    if (
      removedEdgeIds.has(edge.id) ||
      removedPairs.has(pair) ||
      overlay.deletedModuleIds.has(edge.source) ||
      overlay.deletedModuleIds.has(edge.target)
    ) {
      return { ...edge, data: { ...edge.data!, diffState: "removed" } };
    }
    return edge;
  };
}

function phantomDiffEdges(
  edges: readonly Edge[],
  current: readonly RFEdgeT[],
  diffState: "added" | "removed",
): RFEdgeT[] {
  const existingIds = new Set(current.map((e) => e.id));
  const existingPairs = new Set(current.map((e) => `${e.source}->${e.target}`));
  return edges
    .filter((e) => !existingIds.has(e.id) && !existingPairs.has(`${e.source}->${e.target}`))
    .map((e) => ({
      id: `diff-${diffState}:${e.id}`,
      source: e.source,
      target: e.target,
      type: "floating",
      data: {
        isViolation: e.isViolation,
        kind: e.kind,
        diffState,
      },
    }));
}

function phantomRenameEdges(
  pairs: readonly { from: string; to: string }[],
  current: readonly RFEdgeT[],
): RFEdgeT[] {
  const existingIds = new Set(current.map((e) => e.id));
  return pairs
    .filter((pair) => !existingIds.has(`diff-renamed:${pair.from}->${pair.to}`))
    .map((pair) => ({
      id: `diff-renamed:${pair.from}->${pair.to}`,
      source: pair.from,
      target: pair.to,
      type: "floating",
      data: {
        isViolation: false,
        kind: "rename",
        diffState: "renamed" as const,
      },
    }));
}
