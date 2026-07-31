import { expect, vi } from "vitest";
import type { Node } from "@xyflow/react";
import type React from "react";
import { GraphCanvasController } from "../../src/features/graph_canvas/Private/controller/graph-canvas-controller";
import type { GraphSessionStore } from "../../src/state/graph-session";

export function spyGraphCanvasStore() {
  return {
    select: vi.fn(),
    toggleGroup: vi.fn(),
    toggleGroupConnection: vi.fn(),
    toggleModuleConnection: vi.fn(),
    toggleDiffReviewed: vi.fn(),
    setZoomLevel: vi.fn(),
    getZoomLevel: vi.fn(() => 1 as const),
    getDiffOverlay: vi.fn(() => null),
  };
}

/** A click whose target is inside an optional affordance button. */
export function mockNodeClickEvent(
  opts: { onCollapse?: boolean; onConnection?: boolean; onDiffReview?: boolean } = {},
): React.MouseEvent {
  const target = {
    closest: (sel: string) => {
      if (opts.onCollapse && sel === "[data-group-toggle]") return {};
      if (opts.onConnection && sel === "[data-connection-toggle]") return {};
      if (opts.onDiffReview && sel === "[data-diff-review-toggle]") return {};
      return null;
    },
  } as unknown as HTMLElement;
  return { target } as unknown as React.MouseEvent;
}

export const collapsedGroupNode = {
  id: "g1",
  type: "group",
  data: { collapsed: false },
} as unknown as Node;

export function expectGroupCollapseToggleWithoutSelect(
  store: ReturnType<typeof spyGraphCanvasStore>,
  groupId = "g1",
): void {
  new GraphCanvasController(store as unknown as GraphSessionStore).onNodeClick(
    collapsedGroupNode,
    mockNodeClickEvent({ onCollapse: /*onCollapseToggle=*/true }),
  );
  expect(store.toggleGroup).toHaveBeenCalledWith(groupId);
  expect(store.select).not.toHaveBeenCalled();
}
