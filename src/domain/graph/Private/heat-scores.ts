// @Architecture(descriptionShort="Percentile-ranks module git metrics into heat scores")
import type { ModuleNode } from "../ModuleNode";
import type { ProjectGraph } from "../ProjectGraph";
import { groupHeatFromModules, percentileRank } from "./heat-ranking";
import type { HeatmapMode, HeatProjection, ModuleHeat } from "./heat-types";

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
