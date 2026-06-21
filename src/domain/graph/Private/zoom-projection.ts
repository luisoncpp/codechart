import type { ProjectGraph } from "../ProjectGraph";
import type { Edge } from "../Edge";

/** Zoom level: 0 bird's-eye, 1 architectural, 1.5 symbols, 2 implementation (source). */
export type ZoomLevel = 0 | 1 | 1.5 | 2;

/** Top-level groups (the L0 default collapse set). */
export function topLevelGroupIds(graph: ProjectGraph): string[] {
  return graph.groups.filter((g) => g.parentId === null).map((g) => g.id);
}

/** Map React Flow's continuous zoom factor to a discrete detail level. */
export function levelFromZoom(factor: number): ZoomLevel {
  if (factor < 0.55) return 0;
  if (factor < 1.1) return 1;
  if (factor < 1.7) return 1.5;
  return 2;
}

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
    return r === null || r === g.id; // expanded, or the outermost collapsed box
  });
  const modules = graph.modules.filter((m) => rep(m.groupId) === null);

  const moduleGroup = new Map(graph.modules.map((m) => [m.id, m.groupId]));
  const endpoint = (moduleId: string) =>
    rep(moduleGroup.get(moduleId) ?? null) ?? moduleId;
  const edges = reduceEdges(graph.edges, endpoint);

  return { ...graph, groups, modules, edges };
}

/**
 * The visible box a hidden node collapses into: the outermost collapsed group in
 * its ancestor chain. `null` when the node is fully expanded (nothing collapsed
 * above it) — including a collapsed group viewed as its own representative.
 */
function representative(
  groupId: string | null,
  collapsed: Set<string>,
  parentOf: Map<string, string | null>,
): string | null {
  let rep: string | null = null;
  let cur = groupId;
  while (cur) {
    if (collapsed.has(cur)) rep = cur; // keep climbing → highest wins
    cur = parentOf.get(cur) ?? null;
  }
  return rep;
}

/** Re-route each endpoint to its visible box, drop self-loops, dedup by id. */
function reduceEdges(edges: Edge[], endpoint: (id: string) => string): Edge[] {
  const byId = new Map<string, Edge>();
  for (const e of edges) {
    const source = endpoint(e.source);
    const target = endpoint(e.target);
    if (source === target) continue; // collapsed onto itself
    // Keep the original id when nothing moved (stable L1 ids); rerouted edges get
    // a synthetic id so parallels onto the same box dedup.
    const moved = source !== e.source || target !== e.target;
    const id = moved ? `${source}->${target}:${e.kind}` : e.id;
    const existing = byId.get(id);
    if (existing) {
      existing.isViolation = existing.isViolation || e.isViolation;
      continue;
    }
    byId.set(id, { ...e, id, source, target });
  }
  return [...byId.values()];
}
