// @Architecture(descriptionShort="Custom hook to counter-scale elements on camera zoom")
import { useStore } from "@xyflow/react";

/** Must stay in sync with `GraphCanvas` `minZoom`. */
export const CANVAS_MIN_ZOOM = 0.15;

/** Enough headroom to hold a constant on-screen size down to `CANVAS_MIN_ZOOM`. */
export const MAX_COUNTER_SCALE = 1 / CANVAS_MIN_ZOOM;

/** Counter-scale so labels stay readable as the camera zooms out. */
export function counterScaleFromZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.min(MAX_COUNTER_SCALE, Math.max(1, 1 / zoom));
}

/** Raw React Flow camera zoom (`transform[2]`). */
export function useCanvasZoom(): number {
  return useStore((s) => s.transform[2]);
}

/** Counter-scale factor so labels stay readable as the camera zooms out. */
export function useZoomCounterScale(): number {
  return counterScaleFromZoom(useCanvasZoom());
}
