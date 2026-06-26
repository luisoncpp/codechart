import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import type React from "react";
import { GraphCanvasController } from "../src/features/graph_canvas/Private/graph-canvas-controller";
import type { GraphSessionStore } from "../src/state/graph-session";

function spyStore() {
  return {
    select: vi.fn(),
    toggleGroup: vi.fn(),
    toggleGroupConnection: vi.fn(),
    toggleModuleConnection: vi.fn(),
    setZoomLevel: vi.fn(),
  };
}

/** A click whose target is inside an optional affordance button. */
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

const groupNode = { id: "g1", type: "group", data: { collapsed: false } } as unknown as Node;

describe("GraphCanvasController.onNodeClick", () => {
  it("toggles the group when the collapse/expand button is clicked", () => {
    const store = spyStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      groupNode,
      clickEvent({ onCollapse: true }),
    );
    expect(store.toggleGroup).toHaveBeenCalledWith("g1");
    expect(store.select).not.toHaveBeenCalled();
  });

  it("does not toggle for a body click on an expanded group", () => {
    const store = spyStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      groupNode,
      clickEvent(),
    );
    expect(store.toggleGroup).not.toHaveBeenCalled();
    expect(store.select).not.toHaveBeenCalled();
  });

  it("selects the parent module and triggers the callback when a symbol node is clicked", () => {
    const store = spyStore();
    const onSymbolClick = vi.fn();
    const symbolNode = { id: "s1", type: "symbol", parentId: "m1" } as unknown as Node;
    const evt = clickEvent();

    new GraphCanvasController(
      store as unknown as GraphSessionStore,
      onSymbolClick,
    ).onNodeClick(symbolNode, evt);

    expect(store.select).toHaveBeenCalledWith("m1");
    expect(onSymbolClick).toHaveBeenCalledWith(symbolNode, evt);
  });

  it("toggles group connections when the plug button is clicked", () => {
    const store = spyStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      groupNode,
      clickEvent({ onConnection: true }),
    );
    expect(store.toggleGroupConnection).toHaveBeenCalledWith("g1");
  });

  it("toggles module connections when the plug button is clicked", () => {
    const store = spyStore();
    const moduleNode = { id: "m1", type: "module" } as unknown as Node;
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      moduleNode,
      clickEvent({ onConnection: true }),
    );
    expect(store.toggleModuleConnection).toHaveBeenCalledWith("m1");
  });
});
