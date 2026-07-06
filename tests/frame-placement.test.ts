import { describe, expect, it } from "vitest";
import {
  placeAdjacentFrame,
  type FrameRect,
} from "../src/features/graph_canvas/Private/preview_frames/frame-placement";
import {
  FRAME_WIDTH,
  FRAME_HEIGHT,
} from "../src/features/graph_canvas/Private/preview_frames/frame-list";

const SPACING = 8;
const CONTAINER = { width: 2000, height: 2000 };

function anchorAt(top: number, left: number): FrameRect {
  return { top, left, width: FRAME_WIDTH, height: FRAME_HEIGHT };
}

function frameAt(pos: { top: number; left: number }): FrameRect {
  return { ...pos, width: FRAME_WIDTH, height: FRAME_HEIGHT };
}

describe("placeAdjacentFrame", () => {
  const anchor = anchorAt(500, 500);
  const rightPos = { top: 500, left: 500 + FRAME_WIDTH + SPACING };
  const belowPos = { top: 500 + FRAME_HEIGHT + SPACING, left: 500 };
  const abovePos = { top: 500 - FRAME_HEIGHT - SPACING, left: 500 };

  it("opens at the right of the anchor when free", () => {
    expect(placeAdjacentFrame(anchor, [anchor], CONTAINER)).toEqual(rightPos);
  });

  it("falls to below when the right spot is occupied", () => {
    const existing = [anchor, frameAt(rightPos)];
    expect(placeAdjacentFrame(anchor, existing, CONTAINER)).toEqual(belowPos);
  });

  it("falls to above when right and below are occupied", () => {
    const existing = [anchor, frameAt(rightPos), frameAt(belowPos)];
    expect(placeAdjacentFrame(anchor, existing, CONTAINER)).toEqual(abovePos);
  });

  it("overlaps at the right when every candidate is occupied", () => {
    const existing = [anchor, frameAt(rightPos), frameAt(belowPos), frameAt(abovePos)];
    expect(placeAdjacentFrame(anchor, existing, CONTAINER)).toEqual(rightPos);
  });

  it("treats container overflow as an occupied spot", () => {
    const nearRightEdge = anchorAt(500, CONTAINER.width - FRAME_WIDTH - 10);
    expect(placeAdjacentFrame(nearRightEdge, [nearRightEdge], CONTAINER)).toEqual({
      top: 500 + FRAME_HEIGHT + SPACING,
      left: nearRightEdge.left,
    });
  });

  it("rejects a partial overlap, not just an exact one", () => {
    const partiallyInTheWay = frameAt({
      top: rightPos.top + FRAME_HEIGHT - 20,
      left: rightPos.left + FRAME_WIDTH - 20,
    });
    const existing = [anchor, partiallyInTheWay];
    expect(placeAdjacentFrame(anchor, existing, CONTAINER)).toEqual(belowPos);
  });
});
