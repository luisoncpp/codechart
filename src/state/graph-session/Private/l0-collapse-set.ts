import { allGroupIds, findModule, type ProjectGraph } from "../../../domain/graph";
import type { GraphDiffOverlay } from "../../../domain/diff";
import { uncollapseGroupAndAncestors } from "./ensure-node-visible";

/** L0 default collapse set: every group, except — while a diff is active —
 *  the groups (and their ancestors) that hold a changed or deleted module. */
export function l0CollapseSet(
  graph: ProjectGraph,
  diff: GraphDiffOverlay | null,
): Set<string> {
  const collapsed = new Set(allGroupIds(graph));
  if (!diff) return collapsed;
  const groupIds = [
    ...[...diff.affectedModuleIds].map((id) => findModule(graph, id)?.groupId),
    ...diff.ghostModules.map((m) => m.groupId),
  ];
  for (const groupId of groupIds) {
    if (groupId) uncollapseGroupAndAncestors(graph, groupId, collapsed);
  }
  return collapsed;
}
