// @Architecture(descriptionShort="Partitions all edge segments per style bucket")
import { arrowHeadPath } from "./edge-arrow-zoom";
import type { EdgeDrawStyle, EdgeSegment } from "./edge-path";
import { mergePathD } from "./edge-path-merge";
import type { WorldRect } from "./edge-viewport";
import { filterVisibleSegments } from "./edge-viewport";
import type { ViewportEdgeBucket } from "./viewport-edge-model";

function mergeArrowHeadD(segments: EdgeSegment[]): string {
  if (segments.length === 0) return "";
  return segments.map((s) => arrowHeadPath(s.arrowTip, s.arrowAngle)).join(" ");
}

function bucketFromAllSegments(
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
    mergedArrowPath: mergeArrowHeadD(arrowSegments),
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
