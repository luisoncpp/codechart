import { describe, expect, it } from "vitest";
import type { EdgeSegment } from "../src/features/graph_canvas/Private/edges/edge-path";
import {
  filterVisibleSegments,
  visibleWorldRect,
} from "../src/features/graph_canvas/Private/edges/edge-viewport";

function segment(
  bounds: Pick<EdgeSegment, "minX" | "minY" | "maxX" | "maxY">,
): EdgeSegment {
  return {
    path: "M0,0 L10,10",
    arrowTip: { x: 10, y: 10, side: "right" },
    arrowAngle: 0,
    ...bounds,
  };
}

describe("visibleWorldRect", () => {
  it("maps screen viewport to world coordinates with default pad", () => {
    const rect = visibleWorldRect({
      transform: [100, 50, 2],
      width: 800,
      height: 600,
    });

    expect(rect).toEqual({ x: -150, y: -125, width: 600, height: 500 });
  });

  it("expands by custom pad on all sides", () => {
    const rect = visibleWorldRect(
      { transform: [0, 0, 1], width: 200, height: 100 },
      /*pad=*/ 50,
    );

    expect(rect).toEqual({ x: -50, y: -50, width: 300, height: 200 });
  });
});

describe("filterVisibleSegments", () => {
  const view = { x: 0, y: 0, width: 100, height: 100 };

  it("keeps segments whose bbox overlaps the view", () => {
    const inside = segment({ minX: 10, minY: 10, maxX: 30, maxY: 30 });
    const result = filterVisibleSegments([inside], view);
    expect(result).toEqual([inside]);
  });

  it("drops segments fully outside the view", () => {
    const outside = segment({ minX: 200, minY: 200, maxX: 220, maxY: 220 });
    const result = filterVisibleSegments([outside], view);
    expect(result).toEqual([]);
  });

  it("keeps segments when only one endpoint is offscreen but bbox crosses view", () => {
    const crossing = segment({ minX: -50, minY: 40, maxX: 20, maxY: 60 });
    const result = filterVisibleSegments([crossing], view);
    expect(result).toEqual([crossing]);
  });
});
