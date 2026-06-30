import type { InternalNode, Node } from "@xyflow/react";
import { centerOf, type Box } from "./border-anchor";

/** Absolute layout box for a React Flow internal node (nested modules included). */
export function boxFromInternal(node: InternalNode<Node>): Box {
  const { x, y } = node.internals.positionAbsolute;
  const width = node.width ?? node.measured.width ?? 0;
  const height = node.height ?? node.measured.height ?? 0;
  return { x, y, width, height };
}

/** Flow-space center of a module node, or null when it is not measurable yet. */
export function moduleCenter(node: InternalNode<Node> | undefined) {
  if (!node) return null;
  const box = boxFromInternal(node);
  if (!box.width || !box.height) return null;
  return centerOf(box);
}
