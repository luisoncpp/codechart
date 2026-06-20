import type { ElkNode } from "elkjs/lib/elk-api";
import type { LayoutBox, LayoutedGraph } from "./layout-types";

/**
 * Flattens an ELK result (parent-relative coords) into absolute boxes,
 * splitting groups from modules via `groupIds`.
 */
export function toLayoutedGraph(root: ElkNode, groupIds: Set<string>): LayoutedGraph {
  const groups: LayoutBox[] = [];
  const modules: LayoutBox[] = [];

  const walk = (node: ElkNode, parentId: string | null, ox: number, oy: number) => {
    for (const child of node.children ?? []) {
      const x = ox + (child.x ?? 0);
      const y = oy + (child.y ?? 0);
      const box: LayoutBox = {
        id: child.id,
        parentId,
        x,
        y,
        width: child.width ?? 0,
        height: child.height ?? 0,
      };
      (groupIds.has(child.id) ? groups : modules).push(box);
      walk(child, child.id, x, y);
    }
  };

  walk(root, /*parentId=*/ null, /*ox=*/ 0, /*oy=*/ 0);
  return { groups, modules, width: root.width ?? 0, height: root.height ?? 0 };
}
