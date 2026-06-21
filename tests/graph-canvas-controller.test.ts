import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import type React from "react";
import { GraphCanvasController } from "../src/features/graph_canvas/Private/graph-canvas-controller";
import type { GraphSessionStore } from "../src/state/graph-session";

function spyStore() {
  return {
    select: vi.fn(),
    toggleGroup: vi.fn(),
    setZoomLevel: vi.fn(),
  };
}

/** A click whose target is (or is not) inside the collapse/expand button. */
function clickEvent(onToggleButton: boolean): React.MouseEvent {
  const target = {
    closest: (sel: string) =>
      onToggleButton && sel === "[data-group-toggle]" ? {} : null,
  } as unknown as HTMLElement;
  return { target } as unknown as React.MouseEvent;
}

const groupNode = { id: "g1", type: "group", data: { collapsed: false } } as unknown as Node;

describe("GraphCanvasController.onNodeClick", () => {
  it("toggles the group when the collapse/expand button is clicked", () => {
    const store = spyStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      groupNode,
      clickEvent(/*onToggleButton=*/ true),
    );
    expect(store.toggleGroup).toHaveBeenCalledWith("g1");
    expect(store.select).not.toHaveBeenCalled();
  });

  it("does not toggle for a body click on an expanded group", () => {
    const store = spyStore();
    new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
      groupNode,
      clickEvent(/*onToggleButton=*/ false),
    );
    expect(store.toggleGroup).not.toHaveBeenCalled();
    expect(store.select).not.toHaveBeenCalled();
  });
});
