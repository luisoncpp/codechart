import { describe, expect, it } from "vitest";
import {
  arrowHeadPath,
  showArrowHeadsAtZoom,
} from "../src/features/graph_canvas/Private/edges/edge-arrow-zoom";

describe("showArrowHeadsAtZoom", () => {
  it("hides arrows at L1.5 entry zoom where the overview hairball is still on screen", () => {
    expect(showArrowHeadsAtZoom(0.5)).toBe(false);
    expect(showArrowHeadsAtZoom(0.9)).toBe(false);
    expect(showArrowHeadsAtZoom(1.4)).toBe(false);
  });

  it("shows arrows once an 8px world head is at least 12px on screen", () => {
    expect(showArrowHeadsAtZoom(1.5)).toBe(true);
    expect(showArrowHeadsAtZoom(2)).toBe(true);
  });
});

describe("arrowHeadPath", () => {
  it("returns a closed subpath near the tip", () => {
    const path = arrowHeadPath({ x: 100, y: 50 }, /*angle=*/ 0);
    expect(path.startsWith("M 100,50")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.split(" ").length).toBeGreaterThan(4);
  });
});
