// @Architecture(descriptionShort="Converts ELK layout coordinate outputs to absolute canvas coordinates")
import type { ElkNode } from "elkjs/lib/elk-api";
import type { LayoutBox, LayoutedGraph } from "./layout-types";

interface NodeIdSets {
  groupIds: Set<string>;
  moduleIds: Set<string>;
  descriptionIds: Set<string>;
}

type LayoutBuckets = Pick<LayoutedGraph, "groups" | "modules" | "symbols" | "descriptions">;

function bucketKey(id: string, idSets: NodeIdSets): keyof LayoutBuckets {
  if (idSets.groupIds.has(id)) return "groups";
  if (idSets.moduleIds.has(id)) return "modules";
  if (idSets.descriptionIds.has(id)) return "descriptions";
  return "symbols";
}

function walkElkTree(
  node: ElkNode,
  parentId: string | null,
  ox: number,
  oy: number,
  idSets: NodeIdSets,
  out: LayoutBuckets,
): void {
  for (const child of node.children ?? []) {
    const x = ox + (child.x ?? 0);
    const y = oy + (child.y ?? 0);
    out[bucketKey(child.id, idSets)].push({
      id: child.id,
      parentId,
      x,
      y,
      width: child.width ?? 0,
      height: child.height ?? 0,
    });
    walkElkTree(child, child.id, x, y, idSets, out);
  }
}

/**
 * Flattens an ELK result (parent-relative coords) into absolute boxes,
 * splitting groups, modules, and symbol leaves via id sets.
 */
export function toLayoutedGraph(root: ElkNode, idSets: NodeIdSets): LayoutedGraph {
  const out: LayoutBuckets = { groups: [], modules: [], symbols: [], descriptions: [] };
  walkElkTree(root, /*parentId=*/ null, /*ox=*/ 0, /*oy=*/ 0, idSets, out);
  return { ...out, width: root.width ?? 0, height: root.height ?? 0 };
}
