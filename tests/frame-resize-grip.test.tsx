/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { renderPreviewFrame } from "./helpers/render-preview-frame";

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
