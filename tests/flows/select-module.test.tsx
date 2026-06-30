/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import type React from "react";
import { fireEvent, waitFor } from "@testing-library/react";
import { GraphCanvasController } from "../../src/features/graph_canvas/Private/graph-canvas-controller";
import type { GraphSessionStore } from "../../src/state/graph-session";
import {
  flowGoldenGraph,
  readyGraphStore,
  renderGraphCanvas,
} from "../helpers/flow-graph-canvas";

function clickEvent(opts: { onCollapse?: boolean; onConnection?: boolean } = {}): React.MouseEvent {
  const target = {
    closest: (sel: string) => {
      if (opts.onCollapse && sel === "[data-group-toggle]") return {};
      if (opts.onConnection && sel === "[data-connection-toggle]") return {};
      return null;
    },
  } as unknown as HTMLElement;
  return { target } as unknown as React.MouseEvent;
}

function spyStore() {
  return {
    select: vi.fn(),
    toggleGroup: vi.fn(),
    toggleGroupConnection: vi.fn(),
    toggleModuleConnection: vi.fn(),
  };
}

describe("flow: select-module", () => {
  it("clicking a module selects it in the store", async () => {
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store);
    const moduleId = flowGoldenGraph.modules.find((m) => m.isFacade)!.id;
    await waitFor(() =>
      expect(container.querySelector(`[data-id="${moduleId}"]`)).toBeTruthy(),
    );
    fireEvent.click(container.querySelector(`[data-id="${moduleId}"]`)!);
    expect(store.getSelectedId()).toBe(moduleId);
  });

  it("clicking a collapsed group at L0 selects it in the store", async () => {
    const store = await readyGraphStore();
    store.setZoomLevel(/*level=*/0);
    const { container } = renderGraphCanvas(store);
    await waitFor(() =>
      expect(container.querySelector('[data-id="app"]')).toBeTruthy(),
    );
    fireEvent.click(container.querySelector('[data-id="app"]')!);
    expect(store.getSelectedId()).toBe("app");
  });

  it("clicking an expanded group at L1 selects it in the store", async () => {
    const store = await readyGraphStore();
    const { container } = renderGraphCanvas(store);
    await waitFor(() =>
      expect(container.querySelector('[data-id="core"]')).toBeTruthy(),
    );
    fireEvent.click(container.querySelector('[data-id="core"]')!);
    expect(store.getSelectedId()).toBe("core");
  });

  it("clicking the canvas pane clears the selection", async () => {
    const store = await readyGraphStore();
    store.select("core");
    const { container } = renderGraphCanvas(store);
    await waitFor(() =>
      expect(container.querySelector(".react-flow__pane")).toBeTruthy(),
    );
    fireEvent.click(container.querySelector(".react-flow__pane")!);
    expect(store.getSelectedId()).toBeNull();
  });

  it("clicking the collapse toggle toggles the group without selecting it", () => {
    const store = spyStore();
    const groupNode = { id: "g1", type: "group", data: { collapsed: false } } as unknown as Node;
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      groupNode,
      clickEvent({ onCollapse: /*onCollapseToggle=*/true }),
    );
    expect(store.toggleGroup).toHaveBeenCalledWith("g1");
    expect(store.select).not.toHaveBeenCalled();
  });

  it("clicking the connection toggle toggles connections without selecting", () => {
    const store = spyStore();
    const groupNode = { id: "shared", type: "group" } as unknown as Node;
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      groupNode,
      clickEvent({ onConnection: /*onConnectionToggle=*/true }),
    );
    expect(store.toggleGroupConnection).toHaveBeenCalledWith("shared");
    expect(store.select).not.toHaveBeenCalled();
  });
});
