import { describe, expect, it } from "vitest";
import type { Box } from "../src/features/graph_canvas/Private/edges/border-anchor";
import {
  segmentForEdge,
  type EdgeDrawStyle,
  type EdgeSegment,
} from "../src/features/graph_canvas/Private/edges/edge-path";
import { buildStaticEdgeModel } from "../src/features/graph_canvas/Private/edges/viewport-edge-model";
import { CanvasUiState } from "../src/features/graph_canvas/Private/controller/canvas-ui-state";
import type { RFEdgeT } from "../src/domain/projection";

const style: EdgeDrawStyle = {
  stroke: "#94a3b8",
  lineWidth: 1.2,
  opacity: 1,
  dash: null,
  marker: "arrow",
};

// Viewport 100x100 at zoom 1 → inflated clip rect spans roughly -250..350.
const viewport = { transform: [0, 0, 1] as const, width: 100, height: 100 };
const farLeft: Box = { x: -2000, y: 0, width: 100, height: 40 };
const farRight: Box = { x: 2000, y: 0, width: 100, height: 40 };
const onScreen: Box = { x: 20, y: 20, width: 100, height: 40 };

function segment(sourceBox: Box, targetBox: Box, path: string): EdgeSegment {
  const minX = Math.min(sourceBox.x, targetBox.x);
  const maxX = Math.max(sourceBox.x + sourceBox.width, targetBox.x + targetBox.width);
  return {
    path,
    arrowTip: { x: targetBox.x, y: targetBox.y, side: "left" },
    arrowAngle: 0,
    minX,
    minY: 0,
    maxX,
    maxY: 40,
    sourceBox,
    targetBox,
  };
}

const passingThrough = segment(farLeft, farRight, "M-2000,0 L2000,0");
const oneEndVisible = segment(farLeft, onScreen, "M-2000,0 L20,20");

function mergedPath(hideOffscreenArrows: boolean): string | undefined {
  const model = buildStaticEdgeModel(
    { buckets: [{ style, segments: [passingThrough, oneEndVisible] }] },
    viewport,
    hideOffscreenArrows,
  );
  return model?.buckets[0]?.mergedPath;
}

describe("hide arrows between off-screen modules", () => {
  it("drops an edge whose path crosses the screen but whose endpoints are both off-screen", () => {
    expect(mergedPath(/*hideOffscreenArrows=*/true)).toBe("M-2000,0 L20,20");
  });

  it("tests endpoints against the screen, not the half-screen clip buffer", () => {
    // x=260 is past the screen (tight rect ends at 200) but inside the clip buffer (350).
    const justPastScreen: Box = { x: 260, y: 0, width: 50, height: 40 };
    const buffered = segment(farLeft, justPastScreen, "M-2000,0 L260,0");
    const cache = { buckets: [{ style, segments: [buffered] }] };

    expect(buildStaticEdgeModel(cache, viewport, /*hideOffscreenArrows=*/true)).toBeNull();
    expect(buildStaticEdgeModel(cache, viewport, /*hideOffscreenArrows=*/false)).not.toBeNull();
  });

  it("keeps the crossing edge when the option is off", () => {
    expect(mergedPath(/*hideOffscreenArrows=*/false)).toBe(
      "M-2000,0 L2000,0 M-2000,0 L20,20",
    );
  });

  it("judges a facade retarget by the group box, not the facade module", () => {
    const boxes = new Map<string, Box>([
      ["src/a.ts", farLeft],
      ["src/g/facade.ts", farRight],
      ["src/g", onScreen],
    ]);
    const edge: RFEdgeT = {
      id: "e",
      source: "src/a.ts",
      target: "src/g/facade.ts",
      data: { isViolation: false, kind: "import", groupTargetId: "src/g" },
    };

    const seg = segmentForEdge(edge, boxes)!;

    expect(seg.targetBox).toBe(onScreen);
    const model = buildStaticEdgeModel(
      { buckets: [{ style, segments: [seg] }] },
      viewport,
      /*hideOffscreenArrows=*/true,
    );
    expect(model?.buckets[0]?.mergedPath).toBe(seg.path);
  });

  it("is on by default in CanvasUiState", () => {
    expect(new CanvasUiState().getHideOffscreenArrows()).toBe(true);
  });
});
