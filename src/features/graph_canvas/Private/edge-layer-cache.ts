// @Architecture(descriptionShort="Builds grouped edge segments for the edge layer")
import type { RFEdgeT } from "../../../domain/graph";
import type { Box } from "./border-anchor";
import {
  drawStyleFromEdge,
  segmentForEdge,
  styleKeyFromDrawStyle,
  type EdgeDrawStyle,
  type EdgeSegment,
} from "./edge-path";

export interface EdgeStyleBucket {
  style: EdgeDrawStyle;
  segments: EdgeSegment[];
}

export interface EdgeLayerModel {
  buckets: EdgeStyleBucket[];
}

export function buildEdgeLayerModel(
  edges: RFEdgeT[],
  boxes: Map<string, Box>,
): EdgeLayerModel | null {
  const grouped = new Map<string, EdgeStyleBucket>();
  for (const edge of edges) {
    const segment = segmentForEdge(edge, boxes);
    if (!segment) continue;
    const style = drawStyleFromEdge(edge);
    const key = styleKeyFromDrawStyle(style);
    const bucket = grouped.get(key);
    if (bucket) bucket.segments.push(segment);
    else grouped.set(key, { style, segments: [segment] });
  }
  const buckets = [...grouped.values()];
  if (buckets.every((b) => b.segments.length === 0)) return null;
  return { buckets };
}
