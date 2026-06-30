/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import {
  DEFAULT_INSPECTOR_WIDTH,
  MAX_INSPECTOR_WIDTH,
  MIN_INSPECTOR_WIDTH,
} from "../src/features/inspection_panel";
import { testGraphSessionStore } from "./helpers/test-graph-session-store";
import { renderInspectionPanel } from "./helpers/render-inspection-panel";

async function readyStore() {
  const store = testGraphSessionStore();
  await store.loadProject("/sample");
  return store;
}

function panelAside(): HTMLElement {
  return document.querySelector("aside")!;
}

function resizeHandle(): HTMLElement {
  return screen.getByRole("separator", { name: "Resize inspector" });
}

class TestPointerEvent extends Event {
  clientX: number;
  pointerId: number;

  constructor(type: string, clientX: number, pointerId = 1) {
    super(type, { bubbles: true });
    this.clientX = clientX;
    this.pointerId = pointerId;
  }
}

function dispatchPointer(
  type: "pointermove" | "pointerup",
  target: Element,
  clientX: number,
) {
  target.dispatchEvent(new TestPointerEvent(type, clientX));
}

function dragHandle(fromX: number, toX: number) {
  const handle = resizeHandle();
  act(() => {
    handle.dispatchEvent(new TestPointerEvent("pointerdown", fromX));
  });
  act(() => {
    dispatchPointer("pointermove", handle, toX);
  });
  act(() => {
    dispatchPointer("pointerup", handle, toX);
  });
}

describe("InspectionPanel resize", () => {
  beforeEach(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("renders at the default width", async () => {
    const store = await readyStore();
    renderInspectionPanel(store);
    expect(panelAside()).toHaveStyle({ width: `${DEFAULT_INSPECTOR_WIDTH}px` });
  });

  it("renders at a custom initial width", async () => {
    const store = await readyStore();
    renderInspectionPanel(store, { initialWidth: 360 });
    expect(panelAside()).toHaveStyle({ width: "360px" });
  });

  it("widens when dragging the handle left", async () => {
    const store = await readyStore();
    renderInspectionPanel(store);
    dragHandle(/*fromX=*/500, /*toX=*/400);
    expect(panelAside()).toHaveStyle({ width: "380px" });
  });

  it("narrows when dragging the handle right", async () => {
    const store = await readyStore();
    renderInspectionPanel(store, { initialWidth: 380 });
    dragHandle(/*fromX=*/400, /*toX=*/500);
    expect(panelAside()).toHaveStyle({ width: "280px" });
  });

  it("clamps width to the minimum", async () => {
    const store = await readyStore();
    const onWidthChange = vi.fn();
    renderInspectionPanel(store, {
      controlled: { width: DEFAULT_INSPECTOR_WIDTH, onWidthChange },
    });
    dragHandle(/*fromX=*/300, /*toX=*/900);
    expect(onWidthChange).toHaveBeenLastCalledWith(MIN_INSPECTOR_WIDTH);
  });

  it("clamps width to the maximum", async () => {
    const store = await readyStore();
    const onWidthChange = vi.fn();
    renderInspectionPanel(store, {
      controlled: { width: DEFAULT_INSPECTOR_WIDTH, onWidthChange },
    });
    dragHandle(/*fromX=*/900, /*toX=*/100);
    expect(onWidthChange).toHaveBeenLastCalledWith(MAX_INSPECTOR_WIDTH);
  });

  it("calls onHide from the header button", async () => {
    const store = await readyStore();
    const onHide = vi.fn();
    renderInspectionPanel(store, { onHide });
    fireEvent.click(screen.getByRole("button", { name: "Hide inspector" }));
    expect(onHide).toHaveBeenCalledOnce();
  });
});
