// @Architecture(descriptionShort="Imperative SVG updates for static edge strokes")
import { arrowHeadPath } from "./edge-arrow-zoom";
import { crossHeadLines } from "./edge-cross-head";
import { styleKeyFromDrawStyle } from "./edge-path";
import type { ViewportEdgeBucket, ViewportEdgeModel } from "./viewport-edge-model";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface BucketDomRefs {
  strokePath: SVGPathElement;
  arrowGroup: SVGGElement | null;
  crossGroup: SVGGElement | null;
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
      this.writeCrosses(refs, bucket);
      this.writeArrows(refs, bucket, model.showArrows);
    }
  }

  private writeArrows(
    refs: BucketDomRefs,
    bucket: ViewportEdgeBucket,
    showArrows: boolean,
  ): void {
    const group = refs.arrowGroup;
    if (!group) return;
    while (group.firstChild) group.removeChild(group.firstChild);
    if (!showArrows) return;
    for (const segment of bucket.arrowSegments) {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", arrowHeadPath(segment.arrowTip, segment.arrowAngle));
      path.setAttribute("fill", bucket.style.stroke);
      group.appendChild(path);
    }
  }

  private writeCrosses(refs: BucketDomRefs, bucket: ViewportEdgeBucket): void {
    const group = refs.crossGroup;
    if (!group) return;
    while (group.firstChild) group.removeChild(group.firstChild);
    for (const segment of bucket.crossSegments) {
      const lines = crossHeadLines(segment.arrowTip, segment.arrowAngle);
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("stroke", bucket.style.stroke);
      g.setAttribute("stroke-width", "2.4");
      g.setAttribute("stroke-linecap", "round");
      g.setAttribute("fill", "none");
      this.appendCrossLine(g, {
        x1: lines.x1,
        y1: lines.y1,
        x2: lines.x2,
        y2: lines.y2,
      });
      this.appendCrossLine(g, {
        x1: lines.x3,
        y1: lines.y3,
        x2: lines.x4,
        y2: lines.y4,
      });
      group.appendChild(g);
    }
  }

  private appendCrossLine(
    parent: SVGGElement,
    line: { x1: number; y1: number; x2: number; y2: number },
  ): void {
    const el = document.createElementNS(SVG_NS, "line");
    el.setAttribute("x1", String(line.x1));
    el.setAttribute("y1", String(line.y1));
    el.setAttribute("x2", String(line.x2));
    el.setAttribute("y2", String(line.y2));
    parent.appendChild(el);
  }
}
