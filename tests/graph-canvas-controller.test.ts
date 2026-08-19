import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import { GraphCanvasController } from "../src/features/graph_canvas/Private/controller/graph-canvas-controller";
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

  it("selects the module and triggers the callback when a symbol box is clicked", () => {
    const store = spyGraphCanvasStore();
    const onSymbolClick = vi.fn();
    const moduleNode = { id: "m1", type: "module", data: {} } as unknown as Node;
    const evt = mockNodeClickEvent({ onSymbol: /*onSymbol=*/true });

    new GraphCanvasController(
      store as unknown as GraphSessionStore,
      onSymbolClick,
    ).onNodeClick(moduleNode, evt);

    expect(store.select).toHaveBeenCalledWith("m1");
    expect(onSymbolClick).toHaveBeenCalledWith(moduleNode, evt);
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

  it("toggles diff review without selecting when the review checkbox is clicked", () => {
    const store = spyGraphCanvasStore();
    const moduleNode = { id: "m1", type: "module" } as unknown as Node;
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      moduleNode,
      mockNodeClickEvent({ onDiffReview: true }),
    );
    expect(store.toggleDiffReviewed).toHaveBeenCalledWith("m1");
    expect(store.select).not.toHaveBeenCalled();
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

  it("uses the current level to stabilize live viewport updates", () => {
    const store = spyGraphCanvasStore();
    store.getZoomLevel.mockReturnValue(2);
    new GraphCanvasController(store as unknown as GraphSessionStore).onViewportZoom(3.45);
    expect(store.setZoomLevel).toHaveBeenCalledWith(2);
  });
});

describe("GraphCanvasController.moduleForContextMenu", () => {
  it("resolves a deleted ghost module and marks it deleted", () => {
    const store = spyGraphCanvasStore();
    store.getDiffOverlay.mockReturnValue({
      deletedModuleIds: new Set(["src/gone.ts"]),
      ghostModules: [
        {
          id: "src/gone.ts",
          path: "src/gone.ts",
          label: "gone.ts",
          language: "typescript",
          groupId: null,
          isFacade: false,
          metrics: { loc: 0 },
          exportedSymbols: [],
        },
      ],
    });
    const node = {
      id: "src/gone.ts",
      type: "module",
      data: { color: "#64748b" },
    } as unknown as Node;
    const target = new GraphCanvasController(
      store as unknown as GraphSessionStore,
    ).moduleForContextMenu(node);
    expect(target).toEqual({
      moduleId: "src/gone.ts",
      modulePath: "src/gone.ts",
      color: "#64748b",
      deleted: true,
    });
  });
});
