import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EdgeLayerController } from "../src/features/graph_canvas/Private/edges/edge-layer-controller";
import {
  flushRaf,
  setupFlushController,
  stubRafQueue,
} from "./helpers/edge-layer-flush-fixture";

describe("viewport rAF flush", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("coalesces two rapid LOD flips into one onViewportModel per frame", () => {
    const { controller, rafQueue, onViewportModel } = setupFlushController({
      width: 100,
      height: 100,
    });

    controller.scheduleViewportFlush({
      transform: [0, 0, 0.5],
      width: 100,
      height: 100,
    });
    controller.scheduleViewportFlush({
      transform: [0, 0, 0.6],
      width: 100,
      height: 100,
    });

    expect(rafQueue).toHaveLength(1);
    flushRaf(rafQueue);

    expect(onViewportModel).toHaveBeenCalledTimes(1);
    expect(onViewportModel).toHaveBeenCalledWith(
      expect.objectContaining({ showArrows: true }),
    );
  });

  it("same-cell pan does not call onViewportModel or setAttribute", () => {
    const { controller, rafQueue, onViewportModel, setAttributeSpy } =
      setupFlushController({ width: 100, height: 100 });

    controller.scheduleViewportFlush({
      transform: [0, 0, 0.5],
      width: 100,
      height: 100,
    });
    controller.scheduleViewportFlush({
      transform: [10, 0, 0.5],
      width: 100,
      height: 100,
    });

    flushRaf(rafQueue);

    expect(onViewportModel).not.toHaveBeenCalled();
    expect(setAttributeSpy).not.toHaveBeenCalled();
  });

  it("LOD flip at zoom threshold rebuilds clipped d and enables arrows", () => {
    const { controller, rafQueue, onViewportModel, setAttributeSpy } =
      setupFlushController({ width: 100, height: 100 });

    controller.scheduleViewportFlush({
      transform: [0, 0, 0.6],
      width: 100,
      height: 100,
    });

    flushRaf(rafQueue);

    expect(onViewportModel).toHaveBeenCalledTimes(1);
    expect(onViewportModel).toHaveBeenCalledWith(
      expect.objectContaining({ showArrows: true }),
    );
    expect(setAttributeSpy).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(setAttributeSpy).toHaveBeenCalledWith("d", expect.any(String));
  });

  it("cell change defers the clipped rebuild to an idle callback", () => {
    const { controller, rafQueue, onViewportModel, setAttributeSpy } =
      setupFlushController();

    controller.scheduleViewportFlush({
      transform: [600, 0, 0.5],
      width: 800,
      height: 600,
    });

    flushRaf(rafQueue);
    expect(onViewportModel).not.toHaveBeenCalled();
    expect(setAttributeSpy).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(onViewportModel).toHaveBeenCalledTimes(1);
    expect(setAttributeSpy).toHaveBeenCalledWith("d", expect.any(String));
  });

  it("coalesces cell changes pending in the same idle slot into one rebuild", () => {
    const { controller, rafQueue, onViewportModel } = setupFlushController();

    controller.scheduleViewportFlush({ transform: [600, 0, 0.5], width: 800, height: 600 });
    flushRaf(rafQueue);
    rafQueue.length = 0;
    controller.scheduleViewportFlush({ transform: [1800, 0, 0.5], width: 800, height: 600 });
    flushRaf(rafQueue);

    vi.runAllTimers();
    expect(onViewportModel).toHaveBeenCalledTimes(1);
  });

  it("with hideOffscreenArrows, a same-cell pan rebuilds once after the camera settles", () => {
    const { controller, rafQueue, onViewportModel } = setupFlushController({
      width: 100,
      height: 100,
      hideOffscreenArrows: true,
    });

    controller.scheduleViewportFlush({ transform: [10, 0, 0.5], width: 100, height: 100 });
    flushRaf(rafQueue);
    rafQueue.length = 0;
    vi.advanceTimersByTime(100);
    controller.scheduleViewportFlush({ transform: [20, 0, 0.5], width: 100, height: 100 });
    flushRaf(rafQueue);
    vi.advanceTimersByTime(100);
    expect(onViewportModel).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(onViewportModel).toHaveBeenCalledTimes(1);
  });

  it("without hideOffscreenArrows, a same-cell pan never rebuilds", () => {
    const { controller, rafQueue, onViewportModel } = setupFlushController({
      width: 100,
      height: 100,
    });

    controller.scheduleViewportFlush({ transform: [10, 0, 0.5], width: 100, height: 100 });
    flushRaf(rafQueue);

    vi.runAllTimers();
    expect(onViewportModel).not.toHaveBeenCalled();
  });

  it("dispose() cancels a pending idle rebuild", () => {
    const { controller, rafQueue, onViewportModel } = setupFlushController();

    controller.scheduleViewportFlush({ transform: [600, 0, 0.5], width: 800, height: 600 });
    flushRaf(rafQueue);
    controller.dispose();

    vi.runAllTimers();
    expect(onViewportModel).not.toHaveBeenCalled();
  });

  it("after dispose(), scheduleViewportFlush queues a new rAF", () => {
    const rafQueue = stubRafQueue();

    const controller = new EdgeLayerController({
      storeApi: {
        getState: () => ({ domNode: null, nodeLookup: new Map() }),
      },
      onViewportModel: vi.fn(),
      onEdgesRoot: vi.fn(),
      getEdges: () => [],
      getNodes: () => [],
    });

    controller.scheduleViewportFlush({
      transform: [0, 0, 1],
      width: 100,
      height: 100,
    });
    expect(rafQueue).toHaveLength(1);

    controller.dispose();
    rafQueue.length = 0;

    controller.scheduleViewportFlush({
      transform: [5, 0, 1],
      width: 100,
      height: 100,
    });
    expect(rafQueue).toHaveLength(1);
  });
});
