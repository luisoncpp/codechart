// @Architecture(descriptionShort="Builds absolute layout boxes from React Flow nodes")
import type { InternalNode, Node } from "@xyflow/react";
import type { RFNode } from "../../../domain/graph";
import type { Box } from "./border-anchor";

export function boxesFromFlowNodes(
  flowNodes: RFNode[],
  nodeLookup: Map<string, InternalNode<Node>>,
): Map<string, Box> {
  const byId = new Map(flowNodes.map((node) => [node.id, node]));
  const boxes = new Map<string, Box>();

  for (const node of flowNodes) {
    const internal = nodeLookup.get(node.id);
    const width = pickSize(node.width, internal);
    const height = pickSize(node.height, internal);
    if (!width || !height) continue;

    const { x, y } = internal
      ? internal.internals.positionAbsolute
      : absolutePosition(node, byId);
    boxes.set(node.id, { x, y, width, height });
  }
  return boxes;
}

function pickSize(
  fromNode: number | undefined,
  internal: InternalNode<Node> | undefined,
): number {
  return (
    fromNode ??
    internal?.width ??
    internal?.measured.width ??
    internal?.initialWidth ??
    0
  );
}

function absolutePosition(
  node: RFNode,
  byId: Map<string, RFNode>,
): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}
