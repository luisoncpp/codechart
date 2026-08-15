import { describe, expect, it } from "vitest";
import {
  findNodeCenter,
  nodeCenterFromLayout,
  nodeCenterFromNodeLookup,
  viewportCanPan,
} from "../src/features/graph_canvas/Private/navigation/focus-viewport";
import type { LayoutedGraph } from "../src/domain/layout";

const layout: LayoutedGraph = {
  groups: [
    { id: "core", parentId: null, x: 100, y: 50, width: 400, height: 300 },
  ],
  modules: [
    { id: "src/a.ts", parentId: "core", x: 200, y: 100, width: 120, height: 48 },
  ],
  symbols: [],
  descriptions: [],
  width: 800,
  height: 600,
};

describe("nodeCenterFromLayout", () => {
  it("returns the absolute center of a layout module box", () => {
    expect(nodeCenterFromLayout(layout, "src/a.ts")).toEqual({ x: 260, y: 124 });
  });

  it("returns the absolute center of a layout group box", () => {
    expect(nodeCenterFromLayout(layout, "core")).toEqual({ x: 300, y: 200 });
  });

  it("returns null for an unknown node", () => {
    expect(nodeCenterFromLayout(layout, "missing")).toBeNull();
  });
});

describe("findNodeCenter & nodeCenterFromNodeLookup", () => {
  it("falls back to nodeLookup when a module is not in the static layout", () => {
    const nodeLookup = new Map<string, any>([
      [
        "src/ghost.ts",
        {
          id: "src/ghost.ts",
          position: { x: 500, y: 300 },
          width: 100,
          height: 60,
          measured: { width: 100, height: 60 },
          internals: { positionAbsolute: { x: 500, y: 300 } },
        },
      ],
    ]);

    expect(nodeCenterFromNodeLookup(nodeLookup, "src/ghost.ts")).toEqual({
      x: 550,
      y: 330,
    });
    expect(findNodeCenter(layout, nodeLookup, "src/ghost.ts")).toEqual({
      x: 550,
      y: 330,
    });
  });

  it("calculates absolute position from parent nodes in nodeLookup when positionAbsolute is missing", () => {
    const nodeLookup = new Map<string, any>([
      [
        "core",
        {
          id: "core",
          position: { x: 100, y: 50 },
        },
      ],
      [
        "src/ghost-child.ts",
        {
          id: "src/ghost-child.ts",
          parentId: "core",
          position: { x: 40, y: 20 },
          width: 80,
          height: 40,
        },
      ],
    ]);

    expect(findNodeCenter(null, nodeLookup, "src/ghost-child.ts")).toEqual({
      x: 180,
      y: 90,
    });
  });
});

describe("viewportCanPan", () => {
  it("requires panZoom and a measured pane", () => {
    expect(viewportCanPan({ panZoom: {}, width: 800, height: 600 })).toBe(true);
    expect(viewportCanPan({ panZoom: null, width: 800, height: 600 })).toBe(false);
    expect(viewportCanPan({ panZoom: {}, width: 0, height: 600 })).toBe(false);
  });
});
