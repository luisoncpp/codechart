// @Architecture(descriptionShort="Applies selection styling to projected edges for the canvas layer")
import { useMemo } from "react";
import type { EdgeFocus, ProjectedGraph, RFEdgeT } from "../../../../domain/graph";
import type { ArrowVisibility } from "../controller/canvas-ui-state";
import { styleEdge } from "./edge-style";

export function useStyledEdges(
  projected: ProjectedGraph | null,
  focus: EdgeFocus | null,
  arrowVisibility: ArrowVisibility = "all",
): RFEdgeT[] {
  return useMemo(() => {
    if (!projected) return [];
    const out: RFEdgeT[] = [];
    for (const e of projected.edges) {
      const styled = styleEdge(e, focus, arrowVisibility);
      if (styled) out.push(styled);
    }
    return out;
  }, [projected, focus, arrowVisibility]);
}

