import { invoke } from "@tauri-apps/api/core";
import { ProjectGraph } from "../../../domain/graph";
import { AnalysisClient } from "../index";

export function createTauriAnalysisClient(): AnalysisClient {
  return {
    async analyzeProject(): Promise<ProjectGraph> {
      return invoke<ProjectGraph>("get_sample_graph");
    },
  };
}
