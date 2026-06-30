import type { LayoutedGraph } from "../../../domain/layout";
import { centerOf } from "./border-anchor";

/** Absolute flow-space center of a laid-out module box. */
export function moduleCenterFromLayout(
  layout: LayoutedGraph,
  moduleId: string,
) {
  const box = layout.modules.find((m) => m.id === moduleId);
  if (!box?.width || !box.height) return null;
  return centerOf(box);
}

export function viewportCanPan(state: {
  panZoom: unknown;
  width: number;
  height: number;
}): boolean {
  return Boolean(
    state.panZoom &&
      Number.isFinite(state.width) &&
      state.width > 0 &&
      Number.isFinite(state.height) &&
      state.height > 0,
  );
}
