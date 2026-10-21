// @Architecture(descriptionShort="Coordinates edge geometry cache and DOM writes")
import type { RFEdgeT, RFNode } from "../../../../domain/projection";
import type { BucketDomRefs } from "./edge-layer-dom-writer";
import { EdgeLayerDomWriter } from "./edge-layer-dom-writer";
import { EdgeLayerRenderer } from "./edge-layer-renderer";
import { readViewport } from "./edge-layer-subscribe";
import type { ViewportInput } from "./edge-viewport";
import { scheduleIdle } from "./schedule-idle";
import type { ViewportEdgeModel } from "./viewport-edge-types";

/** Quiet time after the last camera change before the settle rebuild. */
const SETTLE_DELAY_MS = 150;

type StoreApi = {
  getState: () => {
    domNode: HTMLElement | null;
    nodeLookup: Map<string, unknown>;
  };
};

export interface EdgeLayerControllerDeps {
  storeApi: StoreApi;
  onViewportModel: (model: ViewportEdgeModel | null) => void;
  onEdgesRoot: (root: Element | null) => void;
  getEdges: () => RFEdgeT[];
  getNodes: () => RFNode[];
  getHideOffscreenArrows?: () => boolean;
}

export class EdgeLayerController {
  readonly renderer = new EdgeLayerRenderer();
  readonly writer = new EdgeLayerDomWriter();
  private rafId: number | null = null;
  private pendingViewport: ViewportInput | null = null;
  private cancelClipRebuild: (() => void) | null = null;
  private clipViewport: ViewportInput | null = null;
  private forceClipRebuild = false;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private deps: EdgeLayerControllerDeps) {}

  rebuildFromGeometry(): void {
    const state = this.deps.storeApi.getState();
    const root =
      state.domNode?.querySelector(".react-flow__edges") ?? null;
    this.deps.onEdgesRoot(root);
    if (!root) return;

    this.renderer.setEdges(this.deps.getEdges());
    this.renderer.setHideOffscreenArrows(
      this.deps.getHideOffscreenArrows?.() ?? false,
    );
    this.renderer.rebuildGeometry(
      this.deps.getNodes(),
      state.nodeLookup as never,
    );
    const vp = readViewport(state as never);
    const model = this.renderer.buildStaticModel(vp);
    this.publish(model);
  }

  scheduleViewportFlush(input: ViewportInput): void {
    this.pendingViewport = input;
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(/*flushViewport*/ () => {
      this.rafId = null;
      const vp = this.pendingViewport;
      this.pendingViewport = null;
      if (!vp) return;
      if (this.renderer.clipCellChanged(vp)) this.scheduleClipRebuild(vp);
      if (this.deps.getHideOffscreenArrows?.()) this.scheduleSettleRebuild(vp);
      if (!this.renderer.arrowLodFlipped(vp)) return;
      const model = this.renderer.applyArrowLodFlip(vp);
      if (!model) return;
      this.deps.onViewportModel(model);
    });
  }

  /**
   * Re-clipping merges every bucket's `d`; it runs when the main thread is
   * idle so panning input is never blocked. Edges entering the clip rect may
   * appear a little late — the inflated clip rect hides most of that delay.
   */
  private scheduleClipRebuild(input: ViewportInput, force = false): void {
    this.clipViewport = input;
    this.forceClipRebuild ||= force;
    if (this.cancelClipRebuild) return;
    this.cancelClipRebuild = scheduleIdle(/*rebuildClipped*/ () => {
      this.cancelClipRebuild = null;
      const vp = this.clipViewport;
      const forced = this.forceClipRebuild;
      this.clipViewport = null;
      this.forceClipRebuild = false;
      if (!vp) return;
      if (!forced && !this.renderer.clipCellChanged(vp)) return;
      this.publish(this.renderer.rebuildClippedModel(vp));
    });
  }

  /**
   * Off-screen culling tests endpoints against the exact screen, so modules
   * that scrolled in since the last clip-cell rebuild have no edges yet; one
   * idle rebuild after the camera stops makes the idle view exact.
   */
  private scheduleSettleRebuild(input: ViewportInput): void {
    if (this.settleTimer !== null) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(/*rebuildWhenSettled*/ () => {
      this.settleTimer = null;
      this.scheduleClipRebuild(input, /*force=*/ true);
    }, /*delayInMs=*/ SETTLE_DELAY_MS);
  }

  private publish(model: ViewportEdgeModel | null): void {
    this.deps.onViewportModel(model);
    if (model && this.writer.hasRefs()) this.writer.writeGeometry(model);
  }

  setBucketRefs(key: string, refs: BucketDomRefs | null): void {
    if (refs) this.writer.setBucketRefs(key, refs);
    else this.writer.removeBucketRefs(key);
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.cancelClipRebuild?.();
    this.cancelClipRebuild = null;
    if (this.settleTimer !== null) clearTimeout(this.settleTimer);
    this.settleTimer = null;
  }
}
