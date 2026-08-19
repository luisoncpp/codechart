import { expect } from "vitest";
import { act, fireEvent, waitFor } from "@testing-library/react";
import type { GraphSessionStore } from "../../src/state/graph-session";
import { renderGraphCanvas } from "./flow-graph-canvas";
import { zoomCanvasUntilSymbolVisible } from "./zoom-canvas-for-symbols";

export async function clickSymbolOnCanvas(
  store: GraphSessionStore,
  symbolId: string,
): Promise<{ container: HTMLElement }> {
  const { container } = renderGraphCanvas(store);
  const moduleId = symbolId.split("::")[0]!;
  await waitFor(() =>
    expect(container.querySelector(`[data-id="${moduleId}"]`)).toBeTruthy(),
  );
  await zoomCanvasUntilSymbolVisible(container, symbolId);
  await waitFor(() =>
    expect(container.querySelector(`[data-id="${symbolId}"]`)).toBeTruthy(),
  );
  await act(async () => {
    fireEvent.click(container.querySelector(`[data-id="${symbolId}"]`)!);
  });
  return { container };
}
