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
  it("top-aligns import bullets when module paths wrap", async () => {
    const store = await readyStore();
    const edge = flowGoldenGraph.edges.find((e) => e.kind === "import")!;
    store.select(edge.source);

    renderInspectionPanel(store);
    const imports = screen.getByText(/^Imports/).closest("div")!;
    const link = within(imports).getByRole("button", { name: edge.target });
    const item = link.closest("li")!;
    const bullet = within(item).getByText("•");

    expect(item).toHaveStyle({ display: "flex", alignItems: "flex-start" });
    expect(bullet).toHaveAttribute("aria-hidden", "true");
  });

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

  it("clicking a Renamed from entry focuses the source module", async () => {
    const store = await readyStore();
    const existingMod = store.getGraph()!.modules[0];
    (store as unknown as { diffOverlay: unknown }).diffOverlay = {
      affectedModuleIds: new Set(),
      deletedModuleIds: new Set(["src/old-source.ts"]),
      renamePairs: [{ from: "src/old-source.ts", to: existingMod.id }],
      ghostModules: [],
      addedSymbolIds: new Set(),
      removedSymbolIds: new Set(),
      modifiedSymbolIds: new Set(),
      addedEdgeIds: new Set(),
      addedEdges: [],
      removedEdges: [],
      beforeLayout: null,
      unifiedDiff: null,
      lineDiffByPath: new Map(),
      afterSourceByPath: new Map(),
    };
    store.select(existingMod.id);
    const focusOn = vi.spyOn(store, "focusOn");

    renderInspectionPanel(store);
    const link = screen.getByRole("button", { name: "src/old-source.ts" });
    fireEvent.click(link);

    expect(focusOn).toHaveBeenCalledWith("src/old-source.ts");
  });

  it("focusOn pans the canvas viewport toward a renamed ghost module in diff mode", async () => {
    const store = await readyStore();
    (store as unknown as { diffOverlay: unknown }).diffOverlay = {
      affectedModuleIds: new Set(),
      deletedModuleIds: new Set(["src/old-ghost.ts"]),
      renamePairs: [{ from: "src/old-ghost.ts", to: "src/core/todo.ts" }],
      ghostModules: [
        {
          id: "src/old-ghost.ts",
          path: "src/old-ghost.ts",
          label: "old-ghost.ts",
          language: "typescript",
          groupId: "core",
          isFacade: false,
          metrics: { loc: 10 },
          exportedSymbols: [],
        },
      ],
      addedSymbolIds: new Set(),
      removedSymbolIds: new Set(),
      modifiedSymbolIds: new Set(),
      addedEdgeIds: new Set(),
      addedEdges: [],
      removedEdges: [],
      beforeLayout: null,
      unifiedDiff: null,
      lineDiffByPath: new Map(),
      afterSourceByPath: new Map(),
    };

    const { container } = renderGraphCanvas(store);
    await waitFor(() =>
      expect(container.querySelector(".react-flow__pane")).toBeTruthy(),
    );

    const before = viewportTransform(container);
    await store.focusOn("src/old-ghost.ts");

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
