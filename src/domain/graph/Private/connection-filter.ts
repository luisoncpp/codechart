// @Architecture(descriptionShort="Hides edges for disconnected groups and modules")
import type { ProjectGraph } from "../ProjectGraph";
import { groupParentMap } from "./zoom-projection";

/** True when a group or any ancestor is in the disconnected set. */
export function isGroupDisconnected(
  groupId: string,
  disconnectedGroupIds: Set<string>,
  parentOf: Map<string, string | null>,
): boolean {
  let cur: string | null = groupId;
  while (cur) {
    if (disconnectedGroupIds.has(cur)) return true;
    cur = parentOf.get(cur) ?? null;
  }
  return false;
}

/** True when the module or its owning group subtree is disconnected. */
export function isModuleDisconnected(
  moduleId: string,
  graph: ProjectGraph,
  disconnectedGroupIds: Set<string>,
  disconnectedModuleIds: Set<string>,
): boolean {
  if (disconnectedModuleIds.has(moduleId)) return true;
  const module = graph.modules.find((m) => m.id === moduleId);
  if (!module?.groupId) return false;
  return isGroupDisconnected(module.groupId, disconnectedGroupIds, groupParentMap(graph));
}

/** Drop edges touching a disconnected endpoint (nodes stay visible). */
export function filterDisconnectedEdges(
  graph: ProjectGraph,
  disconnectedGroupIds: Set<string>,
  disconnectedModuleIds: Set<string>,
): ProjectGraph {
  if (disconnectedGroupIds.size === 0 && disconnectedModuleIds.size === 0) return graph;
  const parentOf = groupParentMap(graph);
  const groupIds = new Set(graph.groups.map((g) => g.id));
  const endpointDisconnected = (id: string) =>
    groupIds.has(id)
      ? isGroupDisconnected(id, disconnectedGroupIds, parentOf)
      : isModuleDisconnected(id, graph, disconnectedGroupIds, disconnectedModuleIds);
  const edges = graph.edges.filter(
    (e) => !endpointDisconnected(e.source) && !endpointDisconnected(e.target),
  );
  return edges.length === graph.edges.length ? graph : { ...graph, edges };
}

/** Seed session disconnect sets from group defaults in the analyzed graph. */
export function defaultDisconnectedSets(graph: ProjectGraph): {
  groups: Set<string>;
  modules: Set<string>;
} {
  const groups = new Set(
    graph.groups.filter((g) => g.disconnectedByDefault).map((g) => g.id),
  );
  const modules = new Set(graph.groups.flatMap((g) => g.disconnectedModuleIds ?? []));
  return { groups, modules };
}

export function countHiddenEdges(
  graph: ProjectGraph,
  disconnectedGroupIds: Set<string>,
  disconnectedModuleIds: Set<string>,
): number {
  const filtered = filterDisconnectedEdges(graph, disconnectedGroupIds, disconnectedModuleIds);
  return graph.edges.length - filtered.edges.length;
}
