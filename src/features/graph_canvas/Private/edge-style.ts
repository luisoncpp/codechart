import { MarkerType } from "@xyflow/react";
import type { RFEdgeT } from "../../../domain/graph";

/** Apply the sample's edge aesthetic: solid import arrows, red violations. */
export function styleEdge(edge: RFEdgeT): RFEdgeT {
  const violation = edge.data?.isViolation ?? false;
  const color = violation ? "#dc2626" : "#94a3b8";
  return {
    ...edge,
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    style: { stroke: color, strokeWidth: violation ? 2 : 1.5 },
  };
}
