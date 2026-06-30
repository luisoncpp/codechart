import { describe, expect, it } from "vitest";
import {
  moduleCenterFromLayout,
  viewportCanPan,
} from "../src/features/graph_canvas/Private/focus-viewport";
import type { LayoutedGraph } from "../src/domain/layout";

const layout: LayoutedGraph = {
  groups: [],
  modules: [
    { id: "src/a.ts", parentId: "core", x: 200, y: 100, width: 120, height: 48 },
  ],
  symbols: [],
  descriptions: [],
  width: 800,
  height: 600,
};

describe("moduleCenterFromLayout", () => {
  it("returns the absolute center of a layout module box", () => {
    expect(moduleCenterFromLayout(layout, "src/a.ts")).toEqual({ x: 260, y: 124 });
  });

  it("returns null for an unknown module", () => {
    expect(moduleCenterFromLayout(layout, "missing")).toBeNull();
  });
});

describe("viewportCanPan", () => {
  it("requires panZoom and a measured pane", () => {
    expect(viewportCanPan({ panZoom: {}, width: 800, height: 600 })).toBe(true);
    expect(viewportCanPan({ panZoom: null, width: 800, height: 600 })).toBe(false);
    expect(viewportCanPan({ panZoom: {}, width: 0, height: 600 })).toBe(false);
  });
});
