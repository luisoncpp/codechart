import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EdgeLayerController } from "../src/features/graph_canvas/Private/edges/edge-layer-controller";
import {
  geometryDirty,
  subscribeEdgeLayer,
  viewportDirty,
} from "../src/features/graph_canvas/Private/edges/edge-layer-subscribe";
import { styleEdge } from "../src/features/graph_canvas/Private/edges/edge-style";
import type { RFNode } from "../src/domain/graph";

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

describe("viewport rAF coalescing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function setupController(onViewportModel = vi.fn()) {
    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const domNode = document.createElement("div");
    const edgesRoot = document.createElement("div");
    edgesRoot.className = "react-flow__edges";
    domNode.appendChild(edgesRoot);

    const nodes = [
      {
        id: "a",
        type: "module",
        position: { x: 0, y: 0 },
        width: 100,
        height: 40,
        data: { label: "a", isFacade: false, language: "ts" },
      },
      {
        id: "b",
        type: "module",
        position: { x: 200, y: 0 },
        width: 100,
        height: 40,
        data: { label: "b", isFacade: false, language: "ts" },
      },
    ] satisfies RFNode[];

    const lookup = new Map(
      nodes.map((node) => [
        node.id,
        {
          id: node.id,
          width: node.width,
          height: node.height,
          measured: { width: node.width!, height: node.height! },
          internals: { positionAbsolute: { x: node.position.x, y: node.position.y } },
        },
      ]),
    );

    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];

    const controller = new EdgeLayerController({
      storeApi: {
        getState: () => ({
          domNode,
          nodeLookup: lookup,
          transform: [0, 0, 1.4] as const,
          width: 800,
          height: 600,
        }),
      },
      onViewportModel,
      onEdgesRoot: vi.fn(),
      getEdges: () => edges,
      getNodes: () => nodes,
    });
    controller.rebuildFromGeometry();
    onViewportModel.mockClear();

    const strokePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const arrowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const crossGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const setAttributeSpy = vi.spyOn(strokePath, "setAttribute");
    controller.setBucketRefs("default", {
      strokePath,
      arrowGroup,
      crossGroup,
    });

    return { controller, rafQueue, onViewportModel, setAttributeSpy };
  }

  it("coalesces two rapid LOD flips into one onViewportModel per frame", () => {
    const { controller, rafQueue, onViewportModel } = setupController();

    controller.scheduleArrowLodCheck({
      transform: [0, 0, 1.4],
      width: 100,
      height: 100,
    });
    controller.scheduleArrowLodCheck({
      transform: [0, 0, 1.5],
      width: 100,
      height: 100,
    });

    expect(rafQueue).toHaveLength(1);
    rafQueue[0]!(0);

    expect(onViewportModel).toHaveBeenCalledTimes(1);
    expect(onViewportModel).toHaveBeenCalledWith(
      expect.objectContaining({ showArrows: true }),
    );
  });

  it("pan-only transform changes do not call onViewportModel", () => {
    const { controller, rafQueue, onViewportModel } = setupController();

    controller.scheduleArrowLodCheck({
      transform: [0, 0, 1.4],
      width: 100,
      height: 100,
    });
    controller.scheduleArrowLodCheck({
      transform: [10, 0, 1.4],
      width: 100,
      height: 100,
    });

    rafQueue[0]!(0);

    expect(onViewportModel).not.toHaveBeenCalled();
  });

  it("pan at fixed zoom does not call setAttribute on stroke path", () => {
    const { controller, rafQueue, setAttributeSpy } = setupController();

    controller.scheduleArrowLodCheck({
      transform: [0, 0, 1.4],
      width: 100,
      height: 100,
    });
    controller.scheduleArrowLodCheck({
      transform: [50, 25, 1.4],
      width: 100,
      height: 100,
    });

    rafQueue[0]!(0);

    expect(setAttributeSpy).not.toHaveBeenCalled();
  });

  it("after dispose(), scheduleArrowLodCheck queues a new rAF", () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const controller = new EdgeLayerController({
      storeApi: {
        getState: () => ({ domNode: null, nodeLookup: new Map() }),
      },
      onViewportModel: vi.fn(),
      onEdgesRoot: vi.fn(),
      getEdges: () => [],
      getNodes: () => [],
    });

    controller.scheduleArrowLodCheck({
      transform: [0, 0, 1],
      width: 100,
      height: 100,
    });
    expect(rafQueue).toHaveLength(1);

    controller.dispose();
    rafQueue.length = 0;

    controller.scheduleArrowLodCheck({
      transform: [5, 0, 1],
      width: 100,
      height: 100,
    });
    expect(rafQueue).toHaveLength(1);
  });
});
