// @Architecture(descriptionShort="Viewport culling math for edge segments")
import type { EdgeSegment } from "./edge-path";

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportInput {
  transform: readonly [number, number, number]; // [tx, ty, zoom]
  width: number;
  height: number;
}

export function visibleWorldRect(input: ViewportInput, pad = 100): WorldRect {
  const [tx, ty, rawZoom] = input.transform;
  const zoom = rawZoom === 0 ? 1 : rawZoom; // guard divide-by-zero
  return {
    x: -tx / zoom - pad,
    y: -ty / zoom - pad,
    width: input.width / zoom + 2 * pad,
    height: input.height / zoom + 2 * pad,
  };
}

function rectsIntersect(
  a: WorldRect,
  b: Pick<EdgeSegment, "minX" | "minY" | "maxX" | "maxY">,
): boolean {
  return (
    a.x < b.maxX &&
    a.x + a.width > b.minX &&
    a.y < b.maxY &&
    a.y + a.height > b.minY
  );
}

export function filterVisibleSegments(
  segments: EdgeSegment[],
  rect: WorldRect,
): EdgeSegment[] {
  return segments.filter((segment) => rectsIntersect(rect, segment));
}
