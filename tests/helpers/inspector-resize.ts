import { expect, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { testGraphSessionStore } from "./test-graph-session-store";
import { renderInspectionPanel } from "./render-inspection-panel";

export class TestPointerEvent extends Event {
  clientX: number;
  pointerId: number;

  constructor(type: string, clientX: number, pointerId = 1) {
    super(type, { bubbles: true });
    this.clientX = clientX;
    this.pointerId = pointerId;
  }
}

export function dragHandle(fromX: number, toX: number) {
  const handle = screen.getByRole("separator", { name: "Resize inspector" });
  act(() => {
    handle.dispatchEvent(new TestPointerEvent("pointerdown", fromX));
  });
  act(() => {
    handle.dispatchEvent(new TestPointerEvent("pointermove", toX));
  });
  act(() => {
    handle.dispatchEvent(new TestPointerEvent("pointerup", toX));
  });
}

export async function readyInspectorStore() {
  const store = testGraphSessionStore();
  await store.loadProject("/sample");
  return store;
}

export async function clickHideInspectorExpectingHide() {
  const store = await readyInspectorStore();
  const onHide = vi.fn();
  renderInspectionPanel(store, { onHide });
  fireEvent.click(screen.getByRole("button", { name: "Hide inspector" }));
  expect(onHide).toHaveBeenCalledOnce();
}
