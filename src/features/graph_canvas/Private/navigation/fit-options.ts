// @Architecture(descriptionShort="Per-zoom-level React Flow fitView options")
import type { FitViewOptions } from "@xyflow/react";
import { L0_ZOOM_BOUNDARY } from "../../../../domain/graph";
import type { ZoomLevel } from "../../../../domain/graph";

export function fitOptionsForLevel(level: ZoomLevel): FitViewOptions {
  if (level === 0) return { padding: 0.18, maxZoom: L0_ZOOM_BOUNDARY };
  return { padding: 0.12 };
}
