import { expect } from "vitest";
import { fireEvent, waitFor } from "@testing-library/react";
import type { GraphSessionStore } from "../../src/state/graph-session";
import { renderGraphCanvas } from "./flow-graph-canvas";

export async function renderCanvasWithGroup(
  store: GraphSessionStore,
  groupId: string,
) {
  const { container } = renderGraphCanvas(store);
  await waitFor(() =>
    expect(container.querySelector(`[data-id="${groupId}"]`)).toBeTruthy(),
  );
  const group = container.querySelector(`[data-id="${groupId}"]`)!;
  return { container, group };
}

export async function expectGroupDescription(
  store: GraphSessionStore,
  groupId: string,
  text: string,
) {
  const { group } = await renderCanvasWithGroup(store, groupId);
  expect(group.textContent).toContain(text);
}

export async function clickGroupAndExpectSelected(
  store: GraphSessionStore,
  groupId: string,
) {
  const { container } = await renderCanvasWithGroup(store, groupId);
  fireEvent.click(container.querySelector(`[data-id="${groupId}"]`)!);
  expect(store.getSelectedId()).toBe(groupId);
}
