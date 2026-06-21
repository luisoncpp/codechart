import {
  BaseEdge,
  getBezierPath,
  Position,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
  type Node,
} from "@xyflow/react";
import type { EdgeData } from "../../../domain/graph";
import { borderAnchor, bowedPath, centerOf, type Box, type Side } from "./border-anchor";

/** Sideways arc (px) for soft edges so the dash clears overlapping import edges. */
const SOFT_BOW = 36;

const POSITION: Record<Side, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

/** Floating edge: anchors float to the border facing the other node (Idea 1),
 *  and facade in-edges retarget to the group box via `data.groupTargetId` (Idea 2). */
export function FloatingEdge({ id, source, target, data, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const groupTargetId = (data as EdgeData | undefined)?.groupTargetId;
  const targetNode = useInternalNode(groupTargetId ?? target);
  if (!sourceNode || !targetNode) return null;

  const sourceBox = boxOf(sourceNode);
  const targetBox = boxOf(targetNode);
  const from = borderAnchor(sourceBox, centerOf(targetBox));
  const to = borderAnchor(targetBox, centerOf(sourceBox));
  const isSoft = (data as EdgeData | undefined)?.kind === "soft";
  const path = isSoft
    ? bowedPath(from, to, /*bow=*/ SOFT_BOW)
    : getBezierPath({
        sourceX: from.x,
        sourceY: from.y,
        sourcePosition: POSITION[from.side],
        targetX: to.x,
        targetY: to.y,
        targetPosition: POSITION[to.side],
      })[0];
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}

function boxOf(node: InternalNode<Node>): Box {
  const { x, y } = node.internals.positionAbsolute;
  return { x, y, width: node.measured.width ?? 0, height: node.measured.height ?? 0 };
}
