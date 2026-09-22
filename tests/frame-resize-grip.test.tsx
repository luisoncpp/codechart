/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { renderPreviewFrame } from "./helpers/render-preview-frame";
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  MIN_FRAME_HEIGHT,
  MIN_FRAME_WIDTH,
} from "../src/features/graph_canvas/Private/preview_frames/frame-list";

describe("preview frame resize grip placement", () => {
  it("renders a grip, since the frame no longer uses the native CSS resizer", () => {
    expect(renderPreviewFrame().widget.querySelector(".symbol-widget__resizer")).not.toBeNull();
  });

  it("publishes the scrollbar width, which offsets the grip off the scrollbar", () => {
    // Without it the grip covers the scrollbar's buttons; reserving the space
    // on the body instead would clip the last row early. jsdom has no layout,
    // so only the wiring is checkable here — the offset itself is CSS.
    const { widget } = renderPreviewFrame();

    expect(widget.style.getPropertyValue("--frame-scrollbar-width")).toMatch(/^\d+px$/);
  });
});

describe("preview frame box", () => {
  it("renders at the committed size once a resize has been released", () => {
    const { widget } = renderPreviewFrame({ width: 420, height: 300 });

    expect(widget.style.width).toBe("420px");
    expect(widget.style.height).toBe("300px");
  });

  it("renders the TS default box when nothing has been committed", () => {
    // The stylesheet no longer declares `width`/`height`: `frame-placement.ts`
    // needs the numbers before any element exists, so TypeScript owns them.
    const { widget } = renderPreviewFrame();

    expect(widget.style.width).toBe(`${FRAME_WIDTH}px`);
    expect(widget.style.height).toBe(`${FRAME_HEIGHT}px`);
  });

  it("publishes the resize floors, which the stylesheet reads back", () => {
    const { widget } = renderPreviewFrame();

    expect(widget.style.getPropertyValue("--frame-min-width")).toBe(`${MIN_FRAME_WIDTH}px`);
    expect(widget.style.getPropertyValue("--frame-min-height")).toBe(`${MIN_FRAME_HEIGHT}px`);
  });
});
