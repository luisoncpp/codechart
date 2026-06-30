import type { Edge } from "../Edge";

/** Nearest collapsed group in the ancestor chain; null when nothing collapsed above. */
export function representative(
  groupId: string | null,
  collapsed: Set<string>,
  parentOf: Map<string, string | null>,
): string | null {
  let cur = groupId;
  while (cur) {
    if (collapsed.has(cur)) return cur;
    cur = parentOf.get(cur) ?? null;
  }
  return null;
}

/** Re-route each endpoint to its visible box, drop self-loops, group↔ancestor-group
 *  edges (L0 nested boxes), and dedup by id. */
export function reduceEdges(
  edges: Edge[],
  endpoint: (id: string) => string,
  parentOf: Map<string, string | null>,
  groupIds: Set<string>,
): Edge[] {
  const byId = new Map<string, Edge>();
  for (const e of edges) {
    const source = endpoint(e.source);
    const target = endpoint(e.target);
    if (source === target) continue; // collapsed onto itself
    if (isAncestorGroupEdge(source, target, parentOf, groupIds)) continue;
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

/** Both endpoints are group boxes and one is an ancestor of the other. */
function isAncestorGroupEdge(
  source: string,
  target: string,
  parentOf: Map<string, string | null>,
  groupIds: Set<string>,
): boolean {
  if (!groupIds.has(source) || !groupIds.has(target)) return false;
  return isAncestor(source, target, parentOf) || isAncestor(target, source, parentOf);
}

/** True when `ancestor` is on the parent chain of `groupId` (excluding itself). */
function isAncestor(
  groupId: string,
  ancestor: string,
  parentOf: Map<string, string | null>,
): boolean {
  let cur = parentOf.get(groupId) ?? null;
  while (cur) {
    if (cur === ancestor) return true;
    cur = parentOf.get(cur) ?? null;
  }
  return false;
}
