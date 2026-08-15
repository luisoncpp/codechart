import type { InternalNode, Node } from "@xyflow/react";
import type { LayoutedGraph } from "../../../../domain/layout";
import { centerOf } from "../edges/border-anchor";

/** Absolute flow-space center of a laid-out module or group box. */
export function nodeCenterFromLayout(
  layout: LayoutedGraph,
  id: string,
) {
  const box = [...layout.modules, ...layout.groups].find((item) => item.id === id);
  if (!box?.width || !box.height) return null;
  return centerOf(box);
}

/** Absolute flow-space center of a node from React Flow's nodeLookup (e.g. ghost modules). */
export function nodeCenterFromNodeLookup(
  nodeLookup: Map<string, InternalNode<Node>> | undefined,
  id: string,
): { x: number; y: number } | null {
  if (!nodeLookup) return null;
  const internal = nodeLookup.get(id);
  if (!internal) return null;
  const width =
    internal.measured?.width ?? internal.width ?? internal.initialWidth ?? 0;
  const height =
    internal.measured?.height ?? internal.height ?? internal.initialHeight ?? 0;
  if (!width || !height) return null;

  let x = internal.position.x;
  let y = internal.position.y;
  if (internal.internals?.positionAbsolute) {
    x = internal.internals.positionAbsolute.x;
    y = internal.internals.positionAbsolute.y;
  } else {
    let parentId = internal.parentId;
    while (parentId) {
      const parent = nodeLookup.get(parentId);
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      parentId = parent.parentId;
    }
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
}

/** Finds node center preferring static layout, falling back to dynamic React Flow nodeLookup. */
export function findNodeCenter(
  layout: LayoutedGraph | null,
  nodeLookup: Map<string, InternalNode<Node>> | undefined,
  id: string,
): { x: number; y: number } | null {
  if (layout) {
    const center = nodeCenterFromLayout(layout, id);
    if (center) return center;
  }
  return nodeCenterFromNodeLookup(nodeLookup, id);
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
