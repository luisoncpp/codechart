import { describe, expect, it } from "vitest";
import type { EdgeSegment } from "../src/features/graph_canvas/Private/edges/edge-path";
import {
  CLIP_CELL_VIEWPORT_FRACTION,
  clipCellKey,
  clipCellSize,
  inflateClipRect,
  sameClipCell,
  visibleWorldRect,
  filterVisibleSegments,
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

describe("clipCellSize", () => {
  it("equals max(width, height) times viewport fraction", () => {
    const rect = { x: 0, y: 0, width: 200, height: 100 };
    expect(clipCellSize(rect)).toBe(200 * CLIP_CELL_VIEWPORT_FRACTION);
  });
});

describe("sameClipCell", () => {
  const base = { transform: [0, 0, 1] as const, width: 300, height: 300 };

  it("is true for a small pan within the same cell", () => {
    const shifted = { transform: [10, 5, 1] as const, width: 300, height: 300 };
    expect(sameClipCell(base, shifted)).toBe(true);
  });

  it("is false when pan crosses floor(x / cellSize)", () => {
    const crossed = { transform: [-200, 0, 1] as const, width: 300, height: 300 };
    expect(sameClipCell(base, crossed)).toBe(false);
  });

  it("changes key when zoom doubles at the same pan offset", () => {
    const zoom1 = { transform: [0, 0, 1] as const, width: 300, height: 800 };
    const zoom2 = { transform: [0, 0, 2] as const, width: 300, height: 800 };
    expect(clipCellKey(visibleWorldRect(zoom1))).not.toBe(
      clipCellKey(visibleWorldRect(zoom2)),
    );
  });

  it("changes key when zoom doubles on a square viewport", () => {
    const zoom1 = { transform: [0, 0, 1] as const, width: 800, height: 800 };
    const zoom2 = { transform: [0, 0, 2] as const, width: 800, height: 800 };
    expect(clipCellKey(visibleWorldRect(zoom1))).not.toBe(
      clipCellKey(visibleWorldRect(zoom2)),
    );
  });
});

describe("inflateClipRect", () => {
  it("expands each side by cellSize", () => {
    const rect = { x: 10, y: 20, width: 100, height: 80 };
    const inflated = inflateClipRect(rect, /*cellSize=*/ 50);
    expect(inflated).toEqual({ x: -40, y: -30, width: 200, height: 180 });
  });
});

describe("filterVisibleSegments with clip rect", () => {
  const tight = visibleWorldRect({
    transform: [0, 0, 1],
    width: 100,
    height: 100,
  });
  const cellSize = clipCellSize(tight);
  const clip = inflateClipRect(tight, cellSize);

  it("keeps crossing AABB when one endpoint is off-screen", () => {
    const crossing = segment({ minX: -50, minY: 40, maxX: 20, maxY: 60 });
    expect(filterVisibleSegments([crossing], clip)).toEqual([crossing]);
  });

  it("keeps segment overlapping clipRect but outside tightRect", () => {
    const paddedOnly = segment({ minX: 220, minY: 10, maxX: 240, maxY: 30 });
    expect(filterVisibleSegments([paddedOnly], tight)).toEqual([]);
    expect(filterVisibleSegments([paddedOnly], clip)).toEqual([paddedOnly]);
  });
});
