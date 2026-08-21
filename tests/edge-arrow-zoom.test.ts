import { describe, expect, it } from "vitest";
import {
  arrowHeadPath,
  showArrowHeadsAtZoom,
} from "../src/features/graph_canvas/Private/edges/edge-arrow-zoom";

describe("showArrowHeadsAtZoom", () => {
  it("hides arrows at overview and bird's-eye zoom levels (< 0.55)", () => {
    expect(showArrowHeadsAtZoom(0.3)).toBe(false);
    expect(showArrowHeadsAtZoom(0.45)).toBe(false);
    expect(showArrowHeadsAtZoom(0.54)).toBe(false);
  });

  it("shows arrows from Level 1 card view (zoom >= 0.55)", () => {
    expect(showArrowHeadsAtZoom(0.55)).toBe(true);
    expect(showArrowHeadsAtZoom(0.9)).toBe(true);
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
