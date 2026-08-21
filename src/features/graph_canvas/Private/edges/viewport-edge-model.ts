// @Architecture(descriptionShort="Static world-space edge draw model; zoom gates arrow LOD only")
import type { EdgeDrawStyle, EdgeSegment } from "./edge-path";
import { showArrowHeadsAtZoom } from "./edge-arrow-zoom";
import {
  clipCellSize,
  inflateClipRect,
  type ViewportInput,
  visibleWorldRect,
} from "./edge-viewport";
import { bucketFromVisibleSegments } from "./viewport-edge-bucket";

export interface ViewportEdgeBucket {
  style: EdgeDrawStyle;
  mergedPath: string;
  mergedArrowPath: string;
  arrowSegments: EdgeSegment[];
  crossSegments: EdgeSegment[];
}

export interface ViewportEdgeModel {
  buckets: ViewportEdgeBucket[];
  showArrows: boolean;
}

export function buildStaticEdgeModel(
  cache: { buckets: { style: EdgeDrawStyle; segments: EdgeSegment[] }[] },
  input: ViewportInput,
): ViewportEdgeModel | null {
  if (cache.buckets.length === 0) return null;
  if (cache.buckets.every((bucket) => bucket.segments.length === 0)) return null;

  const tightRect = visibleWorldRect(input);
  const cellSize = clipCellSize(tightRect);
  const clipRect = inflateClipRect(tightRect, cellSize);
  const showArrows = showArrowHeadsAtZoom(input.transform[2]);
  const buckets = cache.buckets
    .map((bucket) =>
      bucketFromVisibleSegments(bucket.style, bucket.segments, clipRect),
    )
    .filter((bucket) => bucket.mergedPath.length > 0);
  if (buckets.length === 0) return null;
  return { buckets, showArrows };
}
