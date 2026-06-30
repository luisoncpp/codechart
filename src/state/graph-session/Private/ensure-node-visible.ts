import {
  findModule,
  groupParentMap,
  type ProjectGraph,
} from "../../../domain/graph";

/** Expand collapsed ancestor groups so a module node can render on the canvas. */
export function expandCollapsedAncestors(
  graph: ProjectGraph,
  moduleId: string,
  collapsed: Set<string>,
): boolean {
  const mod = findModule(graph, moduleId);
  if (!mod?.groupId) return false;

  const parentOf = groupParentMap(graph);
  let changed = false;
  let groupId: string | null = mod.groupId;
  while (groupId) {
    if (collapsed.has(groupId)) {
      collapsed.delete(groupId);
      changed = true;
    }
    groupId = parentOf.get(groupId) ?? null;
  }
  return changed;
}
