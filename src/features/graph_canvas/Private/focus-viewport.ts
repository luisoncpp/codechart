import type { LayoutedGraph } from "../../../domain/layout";
import { centerOf } from "./border-anchor";

/** Absolute flow-space center of a laid-out module or group box. */
export function nodeCenterFromLayout(
  layout: LayoutedGraph,
  id: string,
) {
  const box = [...layout.modules, ...layout.groups].find((item) => item.id === id);
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
