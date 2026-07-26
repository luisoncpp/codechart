// @Architecture(descriptionShort="Line-of-code totals per group tree plus compact formatting")
import type { ProjectGraph } from "../model/ProjectGraph";

/** groupId → summed LOC of every module in its tree (nested groups included).
 *  Pass `visibleModuleIds` to exclude modules the view hides (e.g. tests), so a
 *  group's counter matches the modules actually drawn inside it. Must run on the
 *  **full** graph: at L0 the reduced graph has no modules under collapsed groups. */
export function groupLocTotals(
  graph: ProjectGraph,
  visibleModuleIds?: Set<string>,
): Map<string, number> {
  const parentOf = new Map(graph.groups.map((g) => [g.id, g.parentId]));
  const totals = new Map<string, number>();
  for (const module of graph.modules) {
    if (!module.groupId) continue;
    if (visibleModuleIds && !visibleModuleIds.has(module.id)) continue;
    addToAncestors(totals, parentOf, { groupId: module.groupId, loc: module.metrics.loc });
  }
  return totals;
}

/** Walks the ancestor chain so a nested module counts for every enclosing group. */
function addToAncestors(
  totals: Map<string, number>,
  parentOf: Map<string, string | null>,
  entry: { groupId: string; loc: number },
): void {
  let groupId: string | null | undefined = entry.groupId;
  const seen = new Set<string>();
  while (groupId && !seen.has(groupId)) {
    seen.add(groupId);
    totals.set(groupId, (totals.get(groupId) ?? 0) + entry.loc);
    groupId = parentOf.get(groupId);
  }
}

/** Compact counter text: exact under 1000, else one decimal `k` (`1.2k`). */
export function formatLoc(loc: number): string {
  if (loc < 1000) return String(loc);
  const thousands = loc / 1000;
  const digits = thousands < 10 ? 1 : 0;
  return `${thousands.toFixed(digits)}k`;
}
