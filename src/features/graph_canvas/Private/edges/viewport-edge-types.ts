// @Architecture(descriptionShort="Draw-model shapes shared by the bucket builder and the model builder")
import type { EdgeDrawStyle, EdgeSegment } from "./edge-path";

export interface ViewportEdgeBucket {
  style: EdgeDrawStyle;
  mergedPath: string;
  mergedArrowPath: string;
  mergedCrossPath: string;
  arrowSegments: EdgeSegment[];
  crossSegments: EdgeSegment[];
}

export interface ViewportEdgeModel {
  buckets: ViewportEdgeBucket[];
  showArrows: boolean;
}
