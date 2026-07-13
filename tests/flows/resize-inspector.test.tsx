/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { DEFAULT_INSPECTOR_WIDTH } from "../../src/features/inspection_panel";
import { renderInspectionPanel } from "../helpers/render-inspection-panel";
import {
  inspectorAside,
  renderAppInspector,
} from "../helpers/render-app-inspector";
import { dragHandle, clickHideInspectorExpectingHide, readyInspectorStore } from "../helpers/inspector-resize";

describe("flow: resize-inspector", () => {
  beforeEach(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("dragging the resize handle changes the panel width", async () => {
    const store = await readyInspectorStore();
    renderInspectionPanel(store);
    dragHandle(/*fromX=*/500, /*toX=*/400);
    expect(inspectorAside()).toHaveStyle({ width: "380px" });
  });

  it("clicking Hide inspector hides the panel", async () => {
    await clickHideInspectorExpectingHide();
  });

  it("clicking Show inspector restores the panel at the saved width", async () => {
    const store = await readyInspectorStore();
    renderAppInspector(store, { initialWidth: 360 });
    expect(inspectorAside()).toHaveStyle({ width: "360px" });
    fireEvent.click(screen.getByRole("button", { name: "Hide inspector" }));
    expect(document.querySelector("aside")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show inspector" }));
    expect(inspectorAside()).toHaveStyle({ width: "360px" });
    expect(inspectorAside()).not.toHaveStyle({ width: `${DEFAULT_INSPECTOR_WIDTH}px` });
  });
});
