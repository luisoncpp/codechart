/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderInspectionPanel } from "../helpers/render-inspection-panel";
import {
  flowGoldenGraph,
  readyGraphStore,
  renderGraphCanvas,
} from "../helpers/flow-graph-canvas";

async function readyStore() {
  return readyGraphStore();
}

function viewportTransform(container: HTMLElement): string | null {
  const viewport = container.querySelector(".react-flow__viewport");
  return viewport?.getAttribute("style") ?? null;
}

describe("flow: navigate-from-inspector", () => {
  it("clicking an import focuses the target module in the store", async () => {
    const store = await readyStore();
    const edge = flowGoldenGraph.edges.find((e) => e.kind === "import")!;
    store.select(edge.source);
    const focusOn = vi.spyOn(store, "focusOn");

    renderInspectionPanel(store);
    const imports = screen.getByText(/^Imports/).closest("div")!;
    fireEvent.click(within(imports).getByRole("button", { name: edge.target }));

    expect(focusOn).toHaveBeenCalledWith(edge.target);
    expect(store.getSelectedId()).toBe(edge.target);
  });

  it("clicking an imported-by entry focuses the source module", async () => {
    const store = await readyStore();
    const edge = flowGoldenGraph.edges.find((e) => e.kind === "import")!;
    store.select(edge.target);
    const focusOn = vi.spyOn(store, "focusOn");

    renderInspectionPanel(store);
    const importedBy = screen.getByText(/^Imported by/).closest("div")!;
    fireEvent.click(within(importedBy).getByRole("button", { name: edge.source }));

    expect(focusOn).toHaveBeenCalledWith(edge.source);
    expect(store.getSelectedId()).toBe(edge.source);
  });

  it("focusOn pans the canvas viewport toward the target module", async () => {
    const store = await readyStore();
    const edge = flowGoldenGraph.edges.find((e) => e.kind === "import")!;
    const { container } = renderGraphCanvas(store);
    await waitFor(() =>
      expect(container.querySelector(".react-flow__pane")).toBeTruthy(),
    );

    const before = viewportTransform(container);
    await store.focusOn(edge.target);

    await waitFor(
      () => {
        const after = viewportTransform(container);
        expect(after).toBeTruthy();
        expect(after).not.toBe(before);
      },
      { timeout: /*timeoutMs=*/3000 },
    );
  });
});
