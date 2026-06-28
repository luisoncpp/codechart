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
  const useCross = style.marker === "cross";
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
        <g key={index}>
          <path
            d={segment.path}
            markerEnd={useCross ? undefined : `url(#${markerId})`}
          />
          {useCross && (
            <CrossHead
              tip={segment.arrowTip}
              angle={segment.arrowAngle}
              color={style.stroke}
            />
          )}
        </g>
      ))}
    </g>
  );
}

function CrossHead({
  tip,
  angle,
  color,
}: {
  tip: { x: number; y: number };
  angle: number;
  color: string;
}) {
  const size = 5;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = size * c;
  const dy = size * s;
  const px = -s * size * 0.7;
  const py = c * size * 0.7;
  const x1 = tip.x - dx + px;
  const y1 = tip.y - dy + py;
  const x2 = tip.x - dx - px;
  const y2 = tip.y - dy - py;
  const x3 = tip.x + dx + px;
  const y3 = tip.y + dy + py;
  const x4 = tip.x + dx - px;
  const y4 = tip.y + dy - py;
  return (
    <g stroke={color} strokeWidth={2}>
      <line x1={x1} y1={y1} x2={x3} y2={y3} />
      <line x1={x2} y1={y2} x2={x4} y2={y4} />
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
