// @Architecture(descriptionShort="Stamps and restores L1.5 symbol nodes for diff rendering")
import {
  inferSymbolKind,
  symbolNameFromId,
  type ModuleRFNode,
  type RFNode,
  type SymbolNodeData,
} from "../../graph";
import type { LayoutBox } from "../../layout";
import type { GraphDiffOverlay } from "./types";

export function applySymbolDiffNodes(
  nodes: RFNode[],
  overlay: GraphDiffOverlay,
): RFNode[] {
  const stamped = nodes.map((node) => stampSymbol(node, overlay));
  return [...stamped, ...removedSymbolNodes(stamped, overlay)];
}

function stampSymbol(node: RFNode, overlay: GraphDiffOverlay): RFNode {
  if (node.type !== "symbol") return node;
  const diffState = symbolDiffState(node.id, overlay);
  if (!diffState) return node;
  return { ...node, data: { ...node.data, diffState } };
}

function symbolDiffState(
  id: string,
  overlay: GraphDiffOverlay,
): SymbolNodeData["diffState"] {
  if (overlay.addedSymbolIds.has(id)) return "added";
  if (overlay.removedSymbolIds.has(id)) return "removed";
  if (overlay.modifiedSymbolIds.has(id)) return "modified";
  return undefined;
}

function removedSymbolNodes(nodes: RFNode[], overlay: GraphDiffOverlay): RFNode[] {
  const layout = overlay.beforeLayout;
  if (!layout || overlay.removedSymbolIds.size === 0) return [];
  const showSymbols = nodes.some(
    (node) => node.type === "module" && node.data.showSymbols,
  );
  if (!showSymbols) return [];
  const existing = new Set(nodes.map((node) => node.id));
  const modules = new Map(
    nodes.filter((node): node is ModuleRFNode => node.type === "module")
      .map((node) => [node.id, node]),
  );
  const boxes = [...layout.groups, ...layout.modules, ...layout.symbols];
  const index = new Map(boxes.map((box) => [box.id, box]));
  return layout.symbols.flatMap((box) => {
    if (!overlay.removedSymbolIds.has(box.id) || existing.has(box.id)) return [];
    const parent = box.parentId ? modules.get(box.parentId) : undefined;
    if (!parent || !box.parentId) return [];
    return [removedSymbolNode(box, parent, index)];
  });
}

function removedSymbolNode(
  box: LayoutBox,
  parent: ModuleRFNode,
  index: ReadonlyMap<string, LayoutBox>,
): RFNode {
  const label = symbolNameFromId(box.id);
  const position = fitInsideParent(relativePosition(box, index), box, parent);
  return {
    id: box.id,
    type: "symbol",
    position,
    width: box.width,
    height: box.height,
    style: { width: box.width, height: box.height },
    parentId: parent.id,
    extent: "parent",
    data: {
      label,
      kind: inferSymbolKind(label, parent.data.language),
      color: parent.data.color,
      diffState: "removed",
    },
  };
}

function fitInsideParent(
  position: { x: number; y: number },
  box: LayoutBox,
  parent: ModuleRFNode,
) {
  const parentWidth = parent.width ?? Number(parent.style?.width);
  const parentHeight = parent.height ?? Number(parent.style?.height);
  if (!Number.isFinite(parentWidth) || !Number.isFinite(parentHeight)) return position;
  return {
    x: Math.max(0, Math.min(position.x, parentWidth - box.width)),
    y: Math.max(0, Math.min(position.y, parentHeight - box.height)),
  };
}

function relativePosition(box: LayoutBox, index: ReadonlyMap<string, LayoutBox>) {
  if (!box.parentId) return { x: box.x, y: box.y };
  const parent = index.get(box.parentId);
  if (!parent) return { x: box.x, y: box.y };
  return { x: box.x - parent.x, y: box.y - parent.y };
}
