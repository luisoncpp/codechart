// @Architecture(descriptionShort="Percentile ranking and group heat aggregation")
import type { ProjectGraph } from "../ProjectGraph";
import type { ModuleHeat } from "./heat-types";
import { moduleIdsInGroupTree } from "./selectors";

export function percentileRank(values: number[]): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const capIdx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(0.95 * sorted.length) - 1),
  );
  const cap = sorted[capIdx] ?? sorted[sorted.length - 1]!;
  const capped = values.map((v) => Math.min(v, cap));
  const cappedSorted = [...capped].sort((a, b) => a - b);
  return capped.map((v) => {
    const below = cappedSorted.filter((x) => x < v).length;
    const equal = cappedSorted.filter((x) => x === v).length;
    return (below + equal * 0.5) / cappedSorted.length;
  });
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

/** Groups use p90 of child module scores (including inactive zeros). */
export function groupHeatFromModules(
  graph: ProjectGraph,
  modules: Map<string, ModuleHeat>,
  moduleIds: Set<string>,
): Map<string, ModuleHeat> {
  const groups = new Map<string, ModuleHeat>();
  for (const g of graph.groups) {
    const scores = [...moduleIdsInGroupTree(graph, g.id)]
      .filter((id) => moduleIds.has(id))
      .map((id) => modules.get(id)?.score ?? 0);
    if (scores.length === 0) continue;
    const score = quantile([...scores].sort((a, b) => a - b), 0.9);
    groups.set(g.id, { score, visible: true });
  }
  return groups;
}
