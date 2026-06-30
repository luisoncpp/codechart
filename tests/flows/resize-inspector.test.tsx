/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { DEFAULT_INSPECTOR_WIDTH } from "../../src/features/inspection_panel";
import { testGraphSessionStore } from "../helpers/test-graph-session-store";
import { renderInspectionPanel } from "../helpers/render-inspection-panel";
import {
  inspectorAside,
  renderAppInspector,
} from "../helpers/render-app-inspector";

class TestPointerEvent extends Event {
  clientX: number;
  pointerId: number;

  constructor(type: string, clientX: number, pointerId = 1) {
    super(type, { bubbles: true });
    this.clientX = clientX;
    this.pointerId = pointerId;
  }
}

function dragHandle(fromX: number, toX: number) {
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

async function readyStore() {
  const store = testGraphSessionStore();
  await store.loadProject("/sample");
  return store;
}

describe("flow: resize-inspector", () => {
  beforeEach(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("dragging the resize handle changes the panel width", async () => {
    const store = await readyStore();
    renderInspectionPanel(store);
    dragHandle(/*fromX=*/500, /*toX=*/400);
    expect(inspectorAside()).toHaveStyle({ width: "380px" });
  });

  it("clicking Hide inspector hides the panel", async () => {
    const store = await readyStore();
    const onHide = vi.fn();
    renderInspectionPanel(store, { onHide });
    fireEvent.click(screen.getByRole("button", { name: "Hide inspector" }));
    expect(onHide).toHaveBeenCalledOnce();
  });

  it("clicking Show inspector restores the panel at the saved width", async () => {
    const store = await readyStore();
    renderAppInspector(store, { initialWidth: 360 });
    expect(inspectorAside()).toHaveStyle({ width: "360px" });
    fireEvent.click(screen.getByRole("button", { name: "Hide inspector" }));
    expect(document.querySelector("aside")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show inspector" }));
    expect(inspectorAside()).toHaveStyle({ width: "360px" });
    expect(inspectorAside()).not.toHaveStyle({ width: `${DEFAULT_INSPECTOR_WIDTH}px` });
  });
});
