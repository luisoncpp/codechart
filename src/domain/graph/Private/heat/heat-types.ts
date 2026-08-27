// @Architecture(descriptionShort="Heatmap mode and score projection types")

export type HeatmapMode = "activity" | "risk" | "instability";

export interface ModuleHeat {
  score: number;
  visible: boolean;
}

export interface HeatProjection {
  modules: Map<string, ModuleHeat>;
  groups: Map<string, ModuleHeat>;
}

/** Git activity/risk channels need a repo; instability does not. */
export function heatmapModeNeedsGit(mode: HeatmapMode): boolean {
  return mode === "activity" || mode === "risk";
}

/** View-menu / legend copy. */
export function heatmapModeLabel(mode: HeatmapMode): string {
  if (mode === "activity") return "Activity";
  if (mode === "risk") return "Risk";
  return "Instability";
}
