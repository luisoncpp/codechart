import { describe, expect, it } from "vitest";
import { act, fireEvent, waitFor } from "@testing-library/react";
import { readyGraphStore, renderGraphCanvas } from "./helpers/flow-graph-canvas";

const ZOOM_IN =
  '.react-flow__controls-zoomin, button[aria-label="zoom in"], button[title="zoom in"]';

describe("L2 zoom regression", () => {
  it("zooming to L2 via zoom controls does not throw removeChild error during EdgeLayer reconciliation", async () => {
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store);

    await waitFor(() => {
      expect(container.querySelector(".react-flow")).toBeTruthy();
    });

    const zoomIn = container.querySelector(ZOOM_IN);
    expect(zoomIn).toBeTruthy();

    // Click zoom in multiple times to cross L1.5 and L2 thresholds
    for (let i = 0; i < 20; i++) {
      await act(async () => {
        fireEvent.click(zoomIn!);
      });
    }

    // Verify canvas is still intact and not crashed/blank
    await waitFor(() => {
      expect(container.querySelector(".react-flow")).toBeTruthy();
    });
  });
});
