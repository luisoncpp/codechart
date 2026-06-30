// @Architecture(descriptionShort="Renders a dynamic edge connecting node borders")
import {
  BaseEdge,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import type { EdgeData } from "../../../domain/graph";
import { borderAnchor, centerOf } from "./border-anchor";
import { boxFromInternal } from "./module-center";
import { floatingPathBetween } from "./edge-path";

/** Floating edge: anchors float to the border facing the other node (Idea 1),
 *  and facade in-edges retarget to the group box via `data.groupTargetId` (Idea 2). */
export function FloatingEdge({ id, source, target, data, markerEnd, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const groupTargetId = (data as EdgeData | undefined)?.groupTargetId;
  const targetNode = useInternalNode(groupTargetId ?? target);
  if (!sourceNode || !targetNode) return null;

  const sourceBox = boxFromInternal(sourceNode);
  const targetBox = boxFromInternal(targetNode);
  const from = borderAnchor(sourceBox, centerOf(targetBox));
  const to = borderAnchor(targetBox, centerOf(sourceBox));
  const edgeData = data as EdgeData | undefined;
  const path = floatingPathBetween(from, to, edgeData?.kind === "soft");
  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />;
}
