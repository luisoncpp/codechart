import { invoke } from "@tauri-apps/api/core";
import { ProjectGraph } from "../../../domain/graph";
import { AnalysisClient } from "./analysis-client";

/** Calls the Rust `analyze_project` command over Tauri IPC for a real folder. */
export function createTauriAnalysisClient(): AnalysisClient {
  return {
    async analyzeProject(path: string): Promise<ProjectGraph> {
      return invoke<ProjectGraph>("analyze_project", { path });
    },
    async readModuleSource(root: string, path: string): Promise<string> {
      return invoke<string>("read_module_source", { root, path });
    },
  };
}
