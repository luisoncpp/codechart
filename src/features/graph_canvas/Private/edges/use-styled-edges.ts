// @Architecture(descriptionShort="Applies selection styling to projected edges for the canvas layer")
import { useMemo } from "react";
import type { EdgeFocus } from "../../../../domain/graph";
import type { ProjectedGraph, RFEdgeT } from "../../../../domain/projection";
import { type EdgeDisplayOptions, styleEdges } from "./edge-style";

export function useStyledEdges(
  projected: ProjectedGraph | null,
  focus: EdgeFocus | null,
  { arrowVisibility, showViolationArrows }: EdgeDisplayOptions,
): RFEdgeT[] {
  return useMemo(/*styleVisibleEdges*/ () => {
    if (!projected) return [];
    return styleEdges(projected.edges, focus, { arrowVisibility, showViolationArrows });
  }, [projected, focus, arrowVisibility, showViolationArrows]);
}
