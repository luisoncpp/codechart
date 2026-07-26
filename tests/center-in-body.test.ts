import { describe, expect, it } from "vitest";
import { centerElementInBody } from "../src/features/graph_canvas/Private/preview_frames/center-in-body";

const BODY_HEIGHT = 300;
const LINE_HEIGHT = 18;
/** Layout distance from the body's content top to the target line. */
const LINE_OFFSET = 4000;

interface Frame {
  body: HTMLElement;
  line: HTMLElement;
}

/**
 * A preview frame whose visual box is scaled by `scale` (the fade-in
 * `transform: scale()` a freshly opened frame is still animating through),
 * while its layout box — and therefore `scrollTop` — stays unscaled.
 */
function frameScaledBy(scale: number, layoutHeight = BODY_HEIGHT): Frame {
  const body = document.createElement("div");
  body.className = "symbol-widget__body";
  const line = document.createElement("div");
  body.appendChild(line);
  document.body.appendChild(body);

  Object.defineProperty(body, "scrollTop", { value: 0, writable: true });
  Object.defineProperty(body, "clientHeight", { value: BODY_HEIGHT });
  Object.defineProperty(body, "offsetHeight", { value: layoutHeight });
  body.getBoundingClientRect = () =>
    ({ top: 0, height: BODY_HEIGHT * scale }) as DOMRect;
  line.getBoundingClientRect = () =>
    ({ top: LINE_OFFSET * scale, height: LINE_HEIGHT * scale }) as DOMRect;

  return { body, line };
}

const CENTERED_SCROLL_TOP = LINE_OFFSET - BODY_HEIGHT / 2 + LINE_HEIGHT / 2;

describe("centerElementInBody", () => {
  it("centers the target line in an untransformed frame", () => {
    const { body, line } = frameScaledBy(1);
    centerElementInBody(line);
    expect(body.scrollTop).toBeCloseTo(CENTERED_SCROLL_TOP, 0);
  });

  it("centers the target line while the frame is mid open animation", () => {
    const { body, line } = frameScaledBy(0.99);
    centerElementInBody(line);
    expect(body.scrollTop).toBeCloseTo(CENTERED_SCROLL_TOP, 0);
  });

  it("keeps working when the layout height is unmeasurable", () => {
    const { body, line } = frameScaledBy(1, /*layoutHeight=*/ 0);
    centerElementInBody(line);
    expect(body.scrollTop).toBeCloseTo(CENTERED_SCROLL_TOP, 0);
  });
});
