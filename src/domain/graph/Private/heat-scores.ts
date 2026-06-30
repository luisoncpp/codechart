// @Architecture(descriptionShort="Percentile-ranks module git metrics into heat scores")
import type { ModuleNode } from "../ModuleNode";
import type { ProjectGraph } from "../ProjectGraph";
import { moduleIdsInGroupTree } from "./selectors";

export type HeatmapMode = "activity" | "risk";

export interface ModuleHeat {
  score: number;
  visible: boolean;
}

export interface HeatProjection {
  modules: Map<string, ModuleHeat>;
  groups: Map<string, ModuleHeat>;
}

const COLD_PERCENTILE = 0.1;

/** Raw metric for the active heat mode. */
export function rawHeatValue(module: ModuleNode, mode: HeatmapMode): number | undefined {
  if (mode === "activity") return module.metrics.churn;
  return module.metrics.bugRisk;
}

/** Normalize visible modules to [0, 1]; inactive modules score 0 (coldest hue). */
export function computeHeatProjection(
  graph: ProjectGraph,
  mode: HeatmapMode,
  moduleIds: Set<string>,
): HeatProjection {
  const visible = graph.modules.filter((m) => moduleIds.has(m.id));
  const active = visible
    .map((m) => ({ id: m.id, raw: rawHeatValue(m, mode) ?? 0 }))
    .filter((v) => v.raw > 0);
  const ranked = percentileRank(active.map((v) => v.raw));
  const rankById = new Map(active.map((v, i) => [v.id, ranked[i] ?? 0]));

  const modules = new Map<string, ModuleHeat>();
  for (const m of visible) {
    const raw = rawHeatValue(m, mode) ?? 0;
    const score = raw > 0 ? (rankById.get(m.id) ?? 0) : 0;
    modules.set(m.id, { score, visible: true });
  }
  return { modules, groups: groupHeatFromModules(graph, modules, moduleIds) };
}

function percentileRank(values: number[]): number[] {
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
function groupHeatFromModules(
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

/** Qualitative band for inspector rows. */
export function heatBand(score: number | undefined): "Low" | "Moderate" | "High" | "—" {
  if (score === undefined) return "—";
  if (score <= COLD_PERCENTILE) return "Low";
  if (score < 0.66) return "Moderate";
  return "High";
}

export function formatChurn(churn: number | undefined): string {
  if (churn === undefined) return "—";
  return churn.toFixed(2);
}
