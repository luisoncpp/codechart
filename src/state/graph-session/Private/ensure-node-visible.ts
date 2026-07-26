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

/** Expand a group's collapsed ancestor chain (the group itself is the caller's
 *  business). At L0 every group starts collapsed, so expanding a nested group
 *  alone would swap its card for a header and still show nothing — its contents
 *  stay hidden under the collapsed parent. */
export function expandCollapsedGroupAncestors(
  graph: ProjectGraph,
  groupId: string,
  collapsed: Set<string>,
): boolean {
  const parentOf = groupParentMap(graph);
  let changed = false;
  let ancestor = parentOf.get(groupId) ?? null;
  while (ancestor) {
    if (collapsed.delete(ancestor)) changed = true;
    ancestor = parentOf.get(ancestor) ?? null;
  }
  return changed;
}
