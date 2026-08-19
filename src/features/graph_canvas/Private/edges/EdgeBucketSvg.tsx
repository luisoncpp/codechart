// @Architecture(descriptionShort="SVG paths for a single edge style bucket")
import { useLayoutEffect, useRef } from "react";
import { arrowHeadPath } from "./edge-arrow-zoom";
import { crossHeadLines } from "./edge-cross-head";
import type { BucketDomRefs } from "./edge-layer-dom-writer";
import { styleKeyFromDrawStyle } from "./edge-path";
import type { ViewportEdgeBucket } from "./viewport-edge-model";

interface EdgeBucketSvgProps {
  bucket: ViewportEdgeBucket;
  showArrows: boolean;
  onRefs: (key: string, refs: BucketDomRefs | null) => void;
}

export function EdgeBucketSvg({ bucket, showArrows, onRefs }: EdgeBucketSvgProps) {
  const bucketKey = styleKeyFromDrawStyle(bucket.style);
  const strokeRef = useRef<SVGPathElement>(null);
  const arrowRef = useRef<SVGGElement>(null);
  const crossRef = useRef<SVGGElement>(null);
  const { style } = bucket;
  const dash = style.dash?.join(" ") ?? undefined;

  useLayoutEffect(() => {
    const strokePath = strokeRef.current;
    if (!strokePath) return;
    onRefs(bucketKey, {
      strokePath,
      arrowGroup: arrowRef.current,
      crossGroup: crossRef.current,
    });
    return () => onRefs(bucketKey, null);
  }, [bucketKey, onRefs]);

  return (
    <g
      fill="none"
      stroke={style.stroke}
      strokeWidth={style.lineWidth}
      opacity={style.opacity}
      strokeDasharray={dash}
      strokeLinecap="round"
    >
      <path ref={strokeRef} d={bucket.mergedPath} />
      <g ref={arrowRef} fill={style.stroke}>
        {showArrows &&
          bucket.arrowSegments.map((segment, index) => (
            <path
              key={index}
              d={arrowHeadPath(segment.arrowTip, segment.arrowAngle)}
            />
          ))}
      </g>
      <g ref={crossRef}>
        {bucket.crossSegments.map((segment, index) => (
          <CrossHead
            key={index}
            tip={segment.arrowTip}
            angle={segment.arrowAngle}
            color={style.stroke}
          />
        ))}
      </g>
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
  const lines = crossHeadLines(tip, angle);
  return (
    <g stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <line x1={lines.x1} y1={lines.y1} x2={lines.x2} y2={lines.y2} />
      <line x1={lines.x3} y1={lines.y3} x2={lines.x4} y2={lines.y4} />
    </g>
  );
}
