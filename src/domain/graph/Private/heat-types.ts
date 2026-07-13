// @Architecture(descriptionShort="Heatmap mode and score projection types")

export type HeatmapMode = "activity" | "risk";

export interface ModuleHeat {
  score: number;
  visible: boolean;
}

export interface HeatProjection {
  modules: Map<string, ModuleHeat>;
  groups: Map<string, ModuleHeat>;
}
