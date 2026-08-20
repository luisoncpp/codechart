import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { styleEdge } from "../src/features/graph_canvas/Private/edges/edge-style";
import type { RFNode } from "../src/domain/graph";
import {
  flushRaf,
  setupFlushController,
} from "./helpers/edge-layer-flush-fixture";

describe("viewport rAF clip flush", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("anti-pop: same-cell pan into tight view does not rewrite stroke d", () => {
    const onViewportModel = vi.fn();
    const nodes = [
      {
        id: "a",
        type: "module",
        position: { x: 200, y: 0 },
        width: 40,
        height: 40,
        data: { label: "a", isFacade: false, language: "ts" },
      },
      {
        id: "b",
        type: "module",
        position: { x: 240, y: 0 },
        width: 40,
        height: 40,
        data: { label: "b", isFacade: false, language: "ts" },
      },
    ] satisfies RFNode[];
    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];

    const { controller, rafQueue, setAttributeSpy } = setupFlushController({
      onViewportModel,
      transform: [0, 0, 1],
      width: 100,
      height: 100,
      nodes,
      edges,
    });

    const initialModel = controller.renderer.getViewportModel();
    expect(initialModel!.buckets[0]?.mergedPath.length).toBeGreaterThan(0);

    controller.scheduleViewportFlush({
      transform: [10, 0, 1],
      width: 100,
      height: 100,
    });
    flushRaf(rafQueue);

    expect(onViewportModel).not.toHaveBeenCalled();
    expect(setAttributeSpy).not.toHaveBeenCalled();
  });

  it("geometry rebuild still clips to current viewport", () => {
    const onViewportModel = vi.fn();
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
        position: { x: 50, y: 0 },
        width: 100,
        height: 40,
        data: { label: "b", isFacade: false, language: "ts" },
      },
      {
        id: "c",
        type: "module",
        position: { x: 2000, y: 2000 },
        width: 100,
        height: 40,
        data: { label: "c", isFacade: false, language: "ts" },
      },
      {
        id: "d",
        type: "module",
        position: { x: 2100, y: 2000 },
        width: 100,
        height: 40,
        data: { label: "d", isFacade: false, language: "ts" },
      },
    ] satisfies RFNode[];
    const edges = [
      styleEdge(
        { id: "e1", source: "a", target: "b", data: { isViolation: false, kind: "import" } },
        null,
      ),
      styleEdge(
        { id: "e2", source: "c", target: "d", data: { isViolation: false, kind: "import" } },
        null,
      ),
    ];

    const { controller } = setupFlushController({
      onViewportModel,
      transform: [0, 0, 1.5],
      width: 120,
      height: 80,
      nodes,
      edges,
    });

    const model = controller.renderer.getViewportModel();
    const arrowCount = model!.buckets.reduce((n, b) => n + b.arrowSegments.length, 0);
    const geometryCount = controller.renderer.getGeometry()!.buckets.reduce(
      (n, b) => n + b.segments.length,
      0,
    );

    expect(geometryCount).toBe(2);
    expect(arrowCount).toBe(1);
  });
});
