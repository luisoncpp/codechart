import { describe, expect, it } from "vitest";
import type { EdgeDrawStyle, EdgeSegment } from "../src/features/graph_canvas/Private/edges/edge-path";
import { buildStaticEdgeModel } from "../src/features/graph_canvas/Private/edges/viewport-edge-model";

function segment(
  bounds: Pick<EdgeSegment, "minX" | "minY" | "maxX" | "maxY">,
  path = "M0,0 L10,10",
): EdgeSegment {
  return {
    path,
    arrowTip: { x: 10, y: 10, side: "right" },
    arrowAngle: 0,
    ...bounds,
  };
}

const arrowStyle: EdgeDrawStyle = {
  stroke: "#94a3b8",
  lineWidth: 1.2,
  opacity: 1,
  dash: null,
  marker: "arrow",
};

const crossStyle: EdgeDrawStyle = {
  ...arrowStyle,
  stroke: "#dc2626",
  marker: "cross",
};

describe("buildStaticEdgeModel", () => {
  const inside = segment({ minX: 10, minY: 10, maxX: 30, maxY: 30 }, "M10,10 L30,30");
  const outside = segment({ minX: 500, minY: 500, maxX: 520, maxY: 520 }, "M500,500 L520,520");
  const removed = segment({ minX: 40, minY: 40, maxX: 60, maxY: 60 }, "M40,40 L60,60");

  it("merges all segments into one path per bucket regardless of viewport", () => {
    const model = buildStaticEdgeModel(
      { buckets: [{ style: arrowStyle, segments: [inside, outside] }] },
      { transform: [0, 0, 1], width: 100, height: 100 },
    );

    expect(model).not.toBeNull();
    expect(model!.buckets[0]?.mergedPath).toBe("M10,10 L30,30 M500,500 L520,520");
    expect(model!.showArrows).toBe(false);
    expect(model!.buckets[0]?.arrowSegments).toEqual([inside, outside]);
  });

  it("puts all removed-diff segments in crossSegments, not arrowSegments", () => {
    const model = buildStaticEdgeModel(
      { buckets: [{ style: crossStyle, segments: [removed] }] },
      { transform: [0, 0, 1], width: 100, height: 100 },
    );

    expect(model!.buckets[0]?.crossSegments).toEqual([removed]);
    expect(model!.buckets[0]?.arrowSegments).toEqual([]);
  });

  it("sets showArrows false when zoom is below threshold", () => {
    const model = buildStaticEdgeModel(
      { buckets: [{ style: arrowStyle, segments: [inside] }] },
      { transform: [0, 0, 0.5], width: 100, height: 100 },
    );

    expect(model!.showArrows).toBe(false);
    expect(model!.buckets[0]?.arrowSegments).toEqual([inside]);
  });

  it("stores full arrowSegments in bucket; showArrows gates display", () => {
    const lowZoom = buildStaticEdgeModel(
      { buckets: [{ style: arrowStyle, segments: [inside] }] },
      { transform: [0, 0, 0.5], width: 100, height: 100 },
    );
    const highZoom = buildStaticEdgeModel(
      { buckets: [{ style: arrowStyle, segments: [inside] }] },
      { transform: [0, 0, 1.5], width: 100, height: 100 },
    );

    expect(lowZoom!.buckets[0]?.arrowSegments).toEqual([inside]);
    expect(lowZoom!.showArrows).toBe(false);
    expect(highZoom!.showArrows).toBe(true);
    expect(highZoom!.buckets[0]?.arrowSegments).toEqual([inside]);
  });
});
