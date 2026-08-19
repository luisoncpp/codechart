// @Architecture(descriptionShort="Static world-space edge draw model; zoom gates arrow LOD only")
import type { EdgeDrawStyle, EdgeSegment } from "./edge-path";
import { showArrowHeadsAtZoom } from "./edge-arrow-zoom";
import type { ViewportInput } from "./edge-viewport";
import { bucketFromAllSegments } from "./viewport-edge-bucket";

export interface ViewportEdgeBucket {
  style: EdgeDrawStyle;
  mergedPath: string;
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

  const showArrows = showArrowHeadsAtZoom(input.transform[2]);
  const buckets = cache.buckets.map((bucket) =>
    bucketFromAllSegments(bucket.style, bucket.segments),
  );
  return { buckets, showArrows };
}
