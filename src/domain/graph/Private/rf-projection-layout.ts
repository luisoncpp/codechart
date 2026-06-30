import type { LayoutBox } from "../../layout/Private/layout-types";
import type { GroupRFNode } from "./node-data";
import type { BoxIndex } from "./rf-projection-types";

export function byParentId(boxes: LayoutBox[]): Map<string | null, LayoutBox[]> {
  const map = new Map<string | null, LayoutBox[]>();
  for (const box of boxes) {
    const list = map.get(box.parentId) ?? [];
    list.push(box);
    map.set(box.parentId, list);
  }
  return map;
}

export function relativePosition(box: LayoutBox, index: BoxIndex) {
  const parent = box.parentId ? index.get(box.parentId) : undefined;
  if (!parent) return { x: box.x, y: box.y };
  return { x: box.x - parent.x, y: box.y - parent.y };
}

function depth(box: LayoutBox, index: BoxIndex): number {
  let d = 0;
  let cur = box.parentId ? index.get(box.parentId) : undefined;
  while (cur) {
    d += 1;
    cur = cur.parentId ? index.get(cur.parentId) : undefined;
  }
  return d;
}

export function sortByDepth(nodes: GroupRFNode[], index: BoxIndex): GroupRFNode[] {
  return [...nodes].sort(
    (a, b) => depth(index.get(a.id)!, index) - depth(index.get(b.id)!, index),
  );
}
