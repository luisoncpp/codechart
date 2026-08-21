// @Architecture(descriptionShort="SVG paths for a single edge style bucket")
import { useLayoutEffect, useRef } from "react";
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
  const { style } = bucket;
  const dash = style.dash?.join(" ") ?? undefined;

  useLayoutEffect(() => {
    const strokePath = strokeRef.current;
    if (!strokePath) return;
    onRefs(bucketKey, { strokePath });
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
      {showArrows && bucket.mergedArrowPath.length > 0 && (
        <path
          d={bucket.mergedArrowPath}
          fill={style.stroke}
          stroke={style.stroke}
          strokeWidth={style.lineWidth}
          strokeLinejoin="round"
          strokeDasharray="none"
        />
      )}
      {bucket.mergedCrossPath.length > 0 && (
        <path
          d={bucket.mergedCrossPath}
          stroke={style.stroke}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray="none"
        />
      )}
    </g>
  );
}
