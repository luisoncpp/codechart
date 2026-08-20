// @Architecture(descriptionShort="Coordinates edge geometry cache and DOM writes")
import type { RFEdgeT, RFNode } from "../../../../domain/graph";
import type { BucketDomRefs } from "./edge-layer-dom-writer";
import { EdgeLayerDomWriter } from "./edge-layer-dom-writer";
import { EdgeLayerRenderer } from "./edge-layer-renderer";
import { readViewport } from "./edge-layer-subscribe";
import type { ViewportInput } from "./edge-viewport";
import type { ViewportEdgeModel } from "./viewport-edge-model";

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
}

export class EdgeLayerController {
  readonly renderer = new EdgeLayerRenderer();
  readonly writer = new EdgeLayerDomWriter();
  private rafId: number | null = null;
  private pendingViewport: ViewportInput | null = null;

  constructor(private deps: EdgeLayerControllerDeps) {}

  rebuildFromGeometry(): void {
    const state = this.deps.storeApi.getState();
    const root =
      state.domNode?.querySelector(".react-flow__edges") ?? null;
    this.deps.onEdgesRoot(root);
    if (!root) return;

    this.renderer.setEdges(this.deps.getEdges());
    this.renderer.rebuildGeometry(
      this.deps.getNodes(),
      state.nodeLookup as never,
    );
    const vp = readViewport(state as never);
    const model = this.renderer.buildStaticModel(vp);
    if (!model) {
      this.deps.onViewportModel(null);
      return;
    }
    this.deps.onViewportModel(model);
    if (this.writer.hasRefs()) this.writer.writeGeometry(model);
  }

  scheduleViewportFlush(input: ViewportInput): void {
    this.pendingViewport = input;
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(/*flushViewport*/ () => {
      this.rafId = null;
      const vp = this.pendingViewport;
      this.pendingViewport = null;
      if (!vp) return;
      if (this.renderer.clipCellChanged(vp)) {
        const model = this.renderer.rebuildClippedModel(vp);
        this.deps.onViewportModel(model);
        if (model && this.writer.hasRefs()) this.writer.writeGeometry(model);
        return;
      }
      if (!this.renderer.arrowLodFlipped(vp)) return;
      const model = this.renderer.applyArrowLodFlip(vp);
      if (!model) return;
      this.deps.onViewportModel(model);
    });
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
  }
}
