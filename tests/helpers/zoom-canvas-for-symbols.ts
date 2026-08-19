import { act, fireEvent, waitFor } from "@testing-library/react";
import { expect } from "vitest";

const ZOOM_IN =
  '.react-flow__controls-zoomin, button[aria-label="zoom in"], button[title="zoom in"]';
const MAX_ZOOM_CLICKS = 24;

function symbolSelector(symbolId: string): string {
  return `[data-id="${symbolId}"]`;
}

/** Zoom the React Flow camera until an L1.5 symbol box is painted (screen LOD). */
export async function zoomCanvasUntilSymbolVisible(
  container: HTMLElement,
  symbolId: string,
): Promise<void> {
  const probe = () => container.querySelector(symbolSelector(symbolId));
  if (probe()) return;

  const zoomIn = container.querySelector(ZOOM_IN);
  if (!zoomIn) throw new Error("React Flow zoom-in control not found");

  for (let i = 0; i < MAX_ZOOM_CLICKS; i++) {
    if (probe()) return;
    await act(async () => {
      fireEvent.click(zoomIn);
    });
  }

  await waitFor(() => expect(probe()).toBeTruthy());
}
