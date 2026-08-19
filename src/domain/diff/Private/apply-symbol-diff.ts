// @Architecture(descriptionShort="Stamps and restores L1.5 symbol descriptors for diff rendering")
import {
  inferSymbolKind,
  symbolNameFromId,
  type ModuleRFNode,
  type ModuleSymbolDescriptor,
  type RFNode,
} from "../../graph";
import type { LayoutBox } from "../../layout";
import type { GraphDiffOverlay } from "./types";

export function applySymbolDiffNodes(
  nodes: RFNode[],
  overlay: GraphDiffOverlay,
): RFNode[] {
  return nodes.map((node) => stampModuleSymbols(node, overlay));
}

function stampModuleSymbols(node: RFNode, overlay: GraphDiffOverlay): RFNode {
  if (node.type !== "module" || !node.data.showSymbols) return node;
  const symbols = node.data.symbols ?? [];
  const stamped = symbols.map((symbol) => stampSymbolDescriptor(symbol, overlay));
  const ghosts = removedSymbolDescriptors(node, overlay, stamped);
  if (!stamped.length && !ghosts.length) return node;
  return { ...node, data: { ...node.data, symbols: [...stamped, ...ghosts] } };
}

function stampSymbolDescriptor(
  symbol: ModuleSymbolDescriptor,
  overlay: GraphDiffOverlay,
): ModuleSymbolDescriptor {
  const diffState = symbolDiffState(symbol.id, overlay);
  if (!diffState) return symbol;
  return { ...symbol, diffState };
}

function symbolDiffState(
  id: string,
  overlay: GraphDiffOverlay,
): ModuleSymbolDescriptor["diffState"] {
  if (overlay.addedSymbolIds.has(id)) return "added";
  if (overlay.removedSymbolIds.has(id)) return "removed";
  if (overlay.modifiedSymbolIds.has(id)) return "modified";
  return undefined;
}

function removedSymbolDescriptors(
  parent: ModuleRFNode,
  overlay: GraphDiffOverlay,
  stamped: ModuleSymbolDescriptor[],
): ModuleSymbolDescriptor[] {
  const layout = overlay.beforeLayout;
  if (!layout || overlay.removedSymbolIds.size === 0) return [];
  const existing = new Set(stamped.map((symbol) => symbol.id));
  const boxes = [...layout.groups, ...layout.modules, ...layout.symbols];
  const index = new Map(boxes.map((box) => [box.id, box]));
  return layout.symbols.flatMap((box) => {
    if (!overlay.removedSymbolIds.has(box.id) || existing.has(box.id)) return [];
    if (box.parentId !== parent.id) return [];
    return [removedSymbolDescriptor(box, parent, index)];
  });
}

function removedSymbolDescriptor(
  box: LayoutBox,
  parent: ModuleRFNode,
  index: ReadonlyMap<string, LayoutBox>,
): ModuleSymbolDescriptor {
  const label = symbolNameFromId(box.id);
  const position = fitInsideParent(relativePosition(box, index), box, parent);
  return {
    id: box.id,
    label,
    kind: inferSymbolKind(label, parent.data.language),
    x: position.x,
    y: position.y,
    width: box.width,
    height: box.height,
    diffState: "removed",
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
