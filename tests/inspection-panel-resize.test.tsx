/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import {
  DEFAULT_INSPECTOR_WIDTH,
  MAX_INSPECTOR_WIDTH,
  MIN_INSPECTOR_WIDTH,
} from "../src/features/inspection_panel";
import { renderInspectionPanel } from "./helpers/render-inspection-panel";
import { inspectorAside } from "./helpers/render-app-inspector";
import { dragHandle, clickHideInspectorExpectingHide, readyInspectorStore } from "./helpers/inspector-resize";

describe("InspectionPanel resize", () => {
  beforeEach(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("renders at the default width", async () => {
    const store = await readyInspectorStore();
    renderInspectionPanel(store);
    expect(inspectorAside()).toHaveStyle({ width: `${DEFAULT_INSPECTOR_WIDTH}px` });
  });

  it("renders at a custom initial width", async () => {
    const store = await readyInspectorStore();
    renderInspectionPanel(store, { initialWidth: 360 });
    expect(inspectorAside()).toHaveStyle({ width: "360px" });
  });

  it("widens when dragging the handle left", async () => {
    const store = await readyInspectorStore();
    renderInspectionPanel(store);
    dragHandle(/*fromX=*/500, /*toX=*/400);
    expect(inspectorAside()).toHaveStyle({ width: "380px" });
  });

  it("narrows when dragging the handle right", async () => {
    const store = await readyInspectorStore();
    renderInspectionPanel(store, { initialWidth: 380 });
    dragHandle(/*fromX=*/400, /*toX=*/500);
    expect(inspectorAside()).toHaveStyle({ width: "280px" });
  });

  it("clamps width to the minimum", async () => {
    const store = await readyInspectorStore();
    const onWidthChange = vi.fn();
    renderInspectionPanel(store, {
      controlled: { width: DEFAULT_INSPECTOR_WIDTH, onWidthChange },
    });
    dragHandle(/*fromX=*/300, /*toX=*/900);
    expect(onWidthChange).toHaveBeenLastCalledWith(MIN_INSPECTOR_WIDTH);
  });

  it("clamps width to the maximum", async () => {
    const store = await readyInspectorStore();
    const onWidthChange = vi.fn();
    renderInspectionPanel(store, {
      controlled: { width: DEFAULT_INSPECTOR_WIDTH, onWidthChange },
    });
    dragHandle(/*fromX=*/900, /*toX=*/100);
    expect(onWidthChange).toHaveBeenLastCalledWith(MAX_INSPECTOR_WIDTH);
  });

  it("calls onHide from the header button", async () => {
    await clickHideInspectorExpectingHide();
  });
});
