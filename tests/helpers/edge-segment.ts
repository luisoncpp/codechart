import type { EdgeSegment } from "../../src/features/graph_canvas/Private/edges/edge-path";

/** A segment defined only by its culling bounds; endpoint boxes are placeholders. */
export function segmentWithBounds(
  bounds: Pick<EdgeSegment, "minX" | "minY" | "maxX" | "maxY">,
  path = "M0,0 L10,10",
): EdgeSegment {
  return {
    path,
    arrowTip: { x: 10, y: 10, side: "right" },
    arrowAngle: 0,
    ...bounds,
    sourceBox: { x: 0, y: 0, width: 10, height: 10 },
    targetBox: { x: 0, y: 0, width: 10, height: 10 },
  };
}
