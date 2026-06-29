// @Architecture(descriptionShort="Stamps diff state onto projected React Flow nodes and edges")
import type { Edge, ProjectedGraph, RFEdgeT, RFNode } from "../../graph";
import type { LayoutBox } from "../../layout";
import type { GraphDiffOverlay } from "./types";

/** Stamp diff overlay state onto projected nodes and edges. */
export function applyDiffOverlay(
  projected: ProjectedGraph,
  overlay: GraphDiffOverlay,
): ProjectedGraph {
  const nodes = projected.nodes.map(stampNode(overlay));
  const ghostNodes = ghostModuleNodes(overlay);
  const edges = projected.edges.map(stampEdge(overlay));
  const removed = phantomRemovedEdges(overlay.removedEdges, projected.edges);
  return { nodes: [...nodes, ...ghostNodes], edges: [...edges, ...removed] };
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

function ghostModuleNodes(overlay: GraphDiffOverlay): RFNode[] {
  if (!overlay.beforeLayout || overlay.ghostModules.length === 0) return [];
  const boxes = [
    ...overlay.beforeLayout.groups,
    ...overlay.beforeLayout.modules,
    ...overlay.beforeLayout.symbols,
    ...overlay.beforeLayout.descriptions,
  ];
  const index = new Map(boxes.map((b) => [b.id, b]));
  const layoutById = new Map(overlay.beforeLayout.modules.map((b) => [b.id, b]));
  return overlay.ghostModules.flatMap((mod) => {
    const box = layoutById.get(mod.id);
    if (!box) return [];
    return [
      {
        id: mod.id,
        type: "module" as const,
        position: relativePosition(box, index),
        data: {
          label: mod.label,
          isFacade: mod.isFacade,
          language: mod.language,
          path: mod.path,
          color: "#64748b",
          diffState: "deleted" as const,
          ...(overlay.lineDiffByPath.get(mod.path)
            ? { diffLineDiff: overlay.lineDiffByPath.get(mod.path) }
            : {}),
        },
        style: { width: box.width, height: box.height },
        width: box.width,
        height: box.height,
        ...(mod.groupId ? { parentId: mod.groupId } : {}),
      },
    ];
  });
}

function relativePosition(box: LayoutBox, index: Map<string, LayoutBox>) {
  if (!box.parentId) return { x: box.x, y: box.y };
  const parent = index.get(box.parentId);
  if (!parent) return { x: box.x, y: box.y };
  return { x: box.x - parent.x, y: box.y - parent.y };
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
