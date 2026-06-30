import { expect } from "vitest";
import { act, fireEvent, waitFor } from "@testing-library/react";
import type { GraphSessionStore } from "../../src/state/graph-session";
import { renderGraphCanvas } from "./flow-graph-canvas";

export async function clickSymbolOnCanvas(
  store: GraphSessionStore,
  symbolId: string,
): Promise<{ container: HTMLElement }> {
  const { container } = renderGraphCanvas(store);
  await waitFor(() =>
    expect(container.querySelector(`[data-id="${symbolId}"]`)).toBeTruthy(),
  );
  await act(async () => {
    fireEvent.click(container.querySelector(`[data-id="${symbolId}"]`)!);
  });
  return { container };
}
