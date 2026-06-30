/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from "vitest";
import { act, fireEvent, waitFor } from "@testing-library/react";
import { readyGraphStore } from "../helpers/flow-graph-canvas";
import { clickSymbolOnCanvas } from "../helpers/click-symbol-on-canvas";

describe("flow: preview-symbol", () => {
  it("clicking a symbol at L1.5 selects the parent module and opens the source widget", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    const moduleId = "src/core/store.ts";
    const symbolId = `${moduleId}::TodoStore`;
    await clickSymbolOnCanvas(store, symbolId);
    await waitFor(() => {
      expect(store.getSelectedId()).toBe(moduleId);
      expect(document.querySelector(".symbol-widget")).toBeTruthy();
    });
    const widget = document.querySelector(".symbol-widget")!;
    expect(widget.querySelector(".symbol-widget__title")?.textContent).toBe("TodoStore");
    expect(widget.querySelector(".symbol-widget__path")?.textContent).toBe(
      "src/core/store.ts",
    );
  });

  it("clicking outside the symbol widget dismisses it", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/1.5);
    const symbolId = "src/core/store.ts::TodoStore";
    const { container } = await clickSymbolOnCanvas(store, symbolId);
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget")).toBeTruthy(),
    );
    await act(async () => {
      fireEvent.click(container.querySelector(".react-flow__pane")!);
    });
    await waitFor(() =>
      expect(document.querySelector(".symbol-widget")).toBeNull(),
    );
  });
});
