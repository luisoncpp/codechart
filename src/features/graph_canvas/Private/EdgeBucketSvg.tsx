// @Architecture(descriptionShort="SVG paths for a single edge style bucket")
import type { EdgeStyleBucket } from "./edge-layer-cache";
import { arrowHeadPoints } from "./edge-path";

interface EdgeBucketSvgProps {
  bucket: EdgeStyleBucket;
  markerId: string;
}

export function EdgeBucketSvg({ bucket, markerId }: EdgeBucketSvgProps) {
  const { style, segments } = bucket;
  const dash = style.dash?.join(" ") ?? undefined;
  return (
    <g
      fill="none"
      stroke={style.stroke}
      strokeWidth={style.lineWidth}
      opacity={style.opacity}
      strokeDasharray={dash}
      strokeLinecap="round"
    >
      {segments.map((segment, index) => (
        <path key={index} d={segment.path} markerEnd={`url(#${markerId})`} />
      ))}
    </g>
  );
}

export function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      markerWidth="14"
      markerHeight="14"
      viewBox="-10 -10 20 20"
      markerUnits="strokeWidth"
      orient="auto-start-reverse"
      refX="0"
      refY="0"
    >
      <polyline
        points={arrowHeadPoints()}
        fill={color}
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </marker>
  );
}
