import type { ElkNode } from "elkjs/lib/elk-api";
import type { LayoutBox, LayoutedGraph } from "./layout-types";

/**
 * Flattens an ELK result (parent-relative coords) into absolute boxes,
 * splitting groups, modules, and symbol leaves via id sets.
 */
export function toLayoutedGraph(
  root: ElkNode,
  groupIds: Set<string>,
  moduleIds: Set<string>,
  descriptionIds: Set<string>,
): LayoutedGraph {
  const groups: LayoutBox[] = [];
  const modules: LayoutBox[] = [];
  const symbols: LayoutBox[] = [];
  const descriptions: LayoutBox[] = [];

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
      if (groupIds.has(child.id)) groups.push(box);
      else if (moduleIds.has(child.id)) modules.push(box);
      else if (descriptionIds.has(child.id)) descriptions.push(box);
      else symbols.push(box);
      walk(child, child.id, x, y);
    }
  };

  walk(root, /*parentId=*/ null, /*ox=*/ 0, /*oy=*/ 0);
  return {
    groups,
    modules,
    symbols,
    descriptions,
    width: root.width ?? 0,
    height: root.height ?? 0,
  };
}
