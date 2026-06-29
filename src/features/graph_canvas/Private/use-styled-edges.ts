// @Architecture(descriptionShort="Applies selection styling to projected edges for the canvas layer")
import { useMemo } from "react";
import type { EdgeFocus, ProjectedGraph, RFEdgeT } from "../../../domain/graph";
import { styleEdge } from "./edge-style";

export function useStyledEdges(
  projected: ProjectedGraph | null,
  focus: EdgeFocus | null,
): RFEdgeT[] {
  return useMemo(
    () => (projected ? projected.edges.map((e) => styleEdge(e, focus)) : []),
    [projected, focus],
  );
}
