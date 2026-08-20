// @Architecture(descriptionShort="Partitions all edge segments per style bucket")
import type { EdgeDrawStyle, EdgeSegment } from "./edge-path";
import { mergePathD } from "./edge-path-merge";
import type { WorldRect } from "./edge-viewport";
import { filterVisibleSegments } from "./edge-viewport";
import type { ViewportEdgeBucket } from "./viewport-edge-model";

export function bucketFromAllSegments(
  style: EdgeDrawStyle,
  segments: EdgeSegment[],
): ViewportEdgeBucket {
  const crossSegments: EdgeSegment[] = [];
  const arrowSegments: EdgeSegment[] = [];
  for (const segment of segments) {
    if (style.marker === "cross") crossSegments.push(segment);
    else arrowSegments.push(segment);
  }
  return {
    style,
    mergedPath: mergePathD(segments),
    arrowSegments,
    crossSegments,
  };
}

export function bucketFromVisibleSegments(
  style: EdgeDrawStyle,
  segments: EdgeSegment[],
  clipRect: WorldRect,
): ViewportEdgeBucket {
  const visible = filterVisibleSegments(segments, clipRect);
  return bucketFromAllSegments(style, visible);
}
