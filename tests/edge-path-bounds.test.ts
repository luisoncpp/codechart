import { describe, expect, it } from "vitest";
import { segmentBounds } from "../src/features/graph_canvas/Private/edges/edge-path";

describe("segmentBounds", () => {
  const from = { x: 0, y: 0, side: "bottom" as const };
  const to = { x: 0, y: 100, side: "top" as const };

  it("includes the soft bow control point beyond the straight-line bbox", () => {
    const straight = segmentBounds(from, to, /*isSoft=*/ false);
    const soft = segmentBounds(from, to, /*isSoft=*/ true);

    expect(soft.minX).toBeLessThan(straight.minX);
    expect(soft.maxX).toBe(straight.maxX);
    expect(soft.minY).toBe(straight.minY);
    expect(soft.maxY).toBe(straight.maxY);
    expect(soft.minX).toBeLessThanOrEqual(-36 - 8);
  });
});
