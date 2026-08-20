// @Architecture(descriptionShort="Imperative SVG updates for static edge strokes")
import { styleKeyFromDrawStyle } from "./edge-path";
import type { ViewportEdgeModel } from "./viewport-edge-model";

export interface BucketDomRefs {
  strokePath: SVGPathElement;
}

export class EdgeLayerDomWriter {
  private refs = new Map<string, BucketDomRefs>();

  setBucketRefs(key: string, refs: BucketDomRefs): void {
    this.refs.set(key, refs);
  }

  removeBucketRefs(key: string): void {
    this.refs.delete(key);
  }

  hasRefs(): boolean {
    return this.refs.size > 0;
  }

  writeGeometry(model: ViewportEdgeModel): void {
    for (const bucket of model.buckets) {
      const key = styleKeyFromDrawStyle(bucket.style);
      const refs = this.refs.get(key);
      if (!refs) continue;
      refs.strokePath.setAttribute("d", bucket.mergedPath);
    }
  }
}

