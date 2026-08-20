import { describe, expect, it, vi } from "vitest";
import {
  geometryDirty,
  subscribeEdgeLayer,
  viewportDirty,
} from "../src/features/graph_canvas/Private/edges/edge-layer-subscribe";

function slice(overrides: Record<string, unknown> = {}) {
  return {
    domNode: null,
    nodes: [],
    nodesInitialized: true,
    transform: [0, 0, 1] as const,
    width: 800,
    height: 600,
    nodeLookup: new Map(),
    ...overrides,
  };
}

describe("edge layer subscribe helpers", () => {
  it("geometryDirty when nodes change", () => {
    const prev = slice({ nodes: ["a"] });
    const next = slice({ nodes: ["b"] });
    expect(geometryDirty(next, prev)).toBe(true);
  });

  it("not geometryDirty on transform-only change", () => {
    const nodes: unknown[] = [];
    const prev = slice({ nodes, transform: [0, 0, 1] });
    const next = slice({ nodes, transform: [10, 20, 1] });
    expect(geometryDirty(next, prev)).toBe(false);
  });

  it("viewportDirty when transform changes and nodes ref is same", () => {
    const nodes = ["same"];
    const prev = slice({ nodes, transform: [0, 0, 1] });
    const next = slice({ nodes, transform: [5, 5, 1] });
    expect(viewportDirty(next, prev)).toBe(true);
  });
});

describe("subscribeEdgeLayer", () => {
  it("calls onViewportDirty when transform changes", () => {
    const nodes: unknown[] = [];
    let state = slice({ nodes });
    const listeners: Array<(s: typeof state, p: typeof state) => void> = [];
    const storeApi = {
      subscribe: (fn: (s: typeof state, p: typeof state) => void) => {
        listeners.push(fn);
        return () => {};
      },
      getState: () => state,
    };
    const onViewportDirty = vi.fn();
    subscribeEdgeLayer(storeApi, {
      onGeometryDirty: vi.fn(),
      onViewportDirty,
    });

    const prev = state;
    state = slice({ nodes, transform: [1, 2, 1] });
    listeners[0]!(state, prev);

    expect(onViewportDirty).toHaveBeenCalledWith({
      transform: [1, 2, 1],
      width: 800,
      height: 600,
    });
  });

  it("calls onGeometryDirty when nodes change", () => {
    let state = slice();
    const listeners: Array<(s: typeof state, p: typeof state) => void> = [];
    const storeApi = {
      subscribe: (fn: (s: typeof state, p: typeof state) => void) => {
        listeners.push(fn);
        return () => {};
      },
      getState: () => state,
    };
    const onGeometryDirty = vi.fn();
    subscribeEdgeLayer(storeApi, {
      onGeometryDirty,
      onViewportDirty: vi.fn(),
    });

    const prev = state;
    state = slice({ nodes: ["changed"] });
    listeners[0]!(state, prev);

    expect(onGeometryDirty).toHaveBeenCalled();
  });
});
