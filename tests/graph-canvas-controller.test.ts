import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import { GraphCanvasController } from "../src/features/graph_canvas/Private/graph-canvas-controller";
import type { GraphSessionStore } from "../src/state/graph-session";
import {
  collapsedGroupNode,
  expectGroupCollapseToggleWithoutSelect,
  mockNodeClickEvent,
  spyGraphCanvasStore,
} from "./helpers/graph-canvas-controller";

describe("GraphCanvasController.onNodeClick", () => {
  it("toggles the group when the collapse/expand button is clicked", () => {
    expectGroupCollapseToggleWithoutSelect(spyGraphCanvasStore());
  });

  it("does not toggle for a body click on an expanded group but selects it", () => {
    const store = spyGraphCanvasStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      collapsedGroupNode,
      mockNodeClickEvent(),
    );
    expect(store.toggleGroup).not.toHaveBeenCalled();
    expect(store.select).toHaveBeenCalledWith("g1");
  });

  it("selects the parent module and triggers the callback when a symbol node is clicked", () => {
    const store = spyGraphCanvasStore();
    const onSymbolClick = vi.fn();
    const symbolNode = { id: "s1", type: "symbol", parentId: "m1" } as unknown as Node;
    const evt = mockNodeClickEvent();

    new GraphCanvasController(
      store as unknown as GraphSessionStore,
      onSymbolClick,
    ).onNodeClick(symbolNode, evt);

    expect(store.select).toHaveBeenCalledWith("m1");
    expect(onSymbolClick).toHaveBeenCalledWith(symbolNode, evt);
  });

  it("toggles group connections when the plug button is clicked", () => {
    const store = spyGraphCanvasStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      collapsedGroupNode,
      mockNodeClickEvent({ onConnection: true }),
    );
    expect(store.toggleGroupConnection).toHaveBeenCalledWith("g1");
  });

  it("toggles module connections when the plug button is clicked", () => {
    const store = spyGraphCanvasStore();
    const moduleNode = { id: "m1", type: "module" } as unknown as Node;
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      moduleNode,
      mockNodeClickEvent({ onConnection: true }),
    );
    expect(store.toggleModuleConnection).toHaveBeenCalledWith("m1");
  });
});

describe("GraphCanvasController.onViewportZoom", () => {
  it("maps scroll zoom to the detail level", () => {
    const store = spyGraphCanvasStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onViewportZoom(0.3);
    expect(store.setZoomLevel).toHaveBeenCalledWith(0);
  });

  it("floors at L1 when diff overlay is active", () => {
    const store = spyGraphCanvasStore();
    store.getDiffOverlay.mockReturnValue({ moduleStates: new Map() });
    new GraphCanvasController(store as unknown as GraphSessionStore).onViewportZoom(0.3);
    expect(store.setZoomLevel).toHaveBeenCalledWith(1);
  });
});
