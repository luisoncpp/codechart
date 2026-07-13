// @Architecture(descriptionShort="Helper functions for computing expanded and collapsed group states")
import type { ProjectGraph } from "../ProjectGraph";
import { reduceEdges, representative } from "./zoom-edge-reduction";

/**
 * Reduce a `ProjectGraph` for the current collapse state (pure, TDD §8). Modules
 * and nested groups under a collapsed group disappear; edges that pointed at them
 * re-route to the collapsed group box; self-loops and duplicates are dropped. The
 * underlying graph is never mutated.
 */
export function projectForZoom(
  graph: ProjectGraph,
  collapsedGroupIds: Set<string>,
): ProjectGraph {
  const parentOf = new Map(graph.groups.map((g) => [g.id, g.parentId]));
  const rep = (groupId: string | null) =>
    representative(groupId, collapsedGroupIds, parentOf);

  const groups = graph.groups.filter((g) => {
    const r = rep(g.id);
    return r === null || r === g.id; // expanded, or this group's own collapsed box
  });
  const modules = graph.modules.filter((m) => rep(m.groupId) === null);

  const moduleGroup = new Map(graph.modules.map((m) => [m.id, m.groupId]));
  const endpoint = (moduleId: string) =>
    rep(moduleGroup.get(moduleId) ?? null) ?? moduleId;
  const groupIds = new Set(graph.groups.map((g) => g.id));
  const edges = reduceEdges(graph.edges, endpoint, parentOf, groupIds);

  return { ...graph, groups, modules, edges };
}

/**
 * The visible box a hidden node collapses into: the nearest collapsed group in its
 * ancestor chain (direct parent first). `null` when nothing collapsed above it.
 */
export function collapsedRepresentative(
  groupId: string | null,
  collapsed: Set<string>,
  parentOf: Map<string, string | null>,
): string | null {
  return representative(groupId, collapsed, parentOf);
}

/** True when a module should render (not hidden under a collapsed group). */
export function isModuleExpanded(
  groupId: string | null,
  collapsed: Set<string>,
  parentOf: Map<string, string | null>,
): boolean {
  return collapsedRepresentative(groupId, collapsed, parentOf) === null;
}

export function groupParentMap(graph: ProjectGraph): Map<string, string | null> {
  return new Map(graph.groups.map((g) => [g.id, g.parentId]));
}
