// @Architecture(descriptionShort="Applies selection styling to projected edges for the canvas layer")
import { useMemo } from "react";
import type { ProjectedGraph, RFEdgeT } from "../../../domain/graph";
import { styleEdge } from "./edge-style";

export function useStyledEdges(
  projected: ProjectedGraph | null,
  selectedId: string | null,
): RFEdgeT[] {
  return useMemo(
    () => (projected ? projected.edges.map((e) => styleEdge(e, selectedId)) : []),
    [projected, selectedId],
  );
}
