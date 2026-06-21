import { useStore } from "@xyflow/react";

/** Counter-scale factor so labels stay readable as the camera zooms out.
 *  Clamped 1–2.4× — at low zoom text lands at a constant on-screen size. */
export function useZoomCounterScale(): number {
  const zoom = useStore((s) => s.transform[2]);
  return Math.min(2.4, Math.max(1, 1 / zoom));
}
