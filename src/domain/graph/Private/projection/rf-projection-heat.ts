import type { HeatmapMode } from "../heat/heat-types";
import type { ProjectionCtx } from "./rf-projection-types";

export function heatFields(
  heat: { score: number; visible: boolean } | undefined,
  mode: HeatmapMode | undefined,
) {
  if (mode === undefined) return {};
  return { heatScore: heat?.score ?? 0, heatVisible: true, heatMode: mode };
}

export function heatmapSessionFields(ctx: ProjectionCtx) {
  return ctx.options?.heat ? { heatmapActive: true as const } : {};
}
