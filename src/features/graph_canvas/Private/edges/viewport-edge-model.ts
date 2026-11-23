// @Architecture(descriptionShort="Static world-space edge draw model; zoom gates arrow LOD only")
import type { EdgeDrawStyle, EdgeSegment } from "./edge-path";
import { showArrowHeadsAtZoom } from "./edge-arrow-zoom";
import {
  clipCellSize,
  filterSegmentsWithVisibleEndpoint,
  filterVisibleSegments,
  inflateClipRect,
  type ViewportInput,
  visibleWorldRect,
} from "./edge-viewport";
import { bucketFromSegments } from "./viewport-edge-bucket";
import type { ViewportEdgeModel } from "./viewport-edge-types";

/**
 * `hideOffscreenArrows` culls by endpoint boxes against the tight screen rect
 * (not the inflated clip rect), so an edge whose two endpoints are both
 * off-screen is dropped even when its path crosses the screen. Modules that
 * scroll in between rebuilds get their edges at the next clip-cell or settle
 * rebuild (see EdgeLayerController).
 */
export function buildStaticEdgeModel(
  cache: { buckets: { style: EdgeDrawStyle; segments: EdgeSegment[] }[] },
  input: ViewportInput,
  hideOffscreenArrows = false,
): ViewportEdgeModel | null {
  if (cache.buckets.length === 0) return null;
  if (cache.buckets.every((bucket) => bucket.segments.length === 0)) return null;

  const tightRect = visibleWorldRect(input);
  const clipRect = inflateClipRect(tightRect, clipCellSize(tightRect));
  const cull = (segments: EdgeSegment[]) =>
    hideOffscreenArrows
      ? filterSegmentsWithVisibleEndpoint(segments, tightRect)
      : filterVisibleSegments(segments, clipRect);
  const showArrows = showArrowHeadsAtZoom(input.transform[2]);
  const buckets = cache.buckets
    .map((bucket) => bucketFromSegments(bucket.style, cull(bucket.segments)))
    .filter((bucket) => bucket.mergedPath.length > 0);
  if (buckets.length === 0) return null;
  return { buckets, showArrows };
}
