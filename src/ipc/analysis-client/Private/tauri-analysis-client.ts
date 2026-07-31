// @Architecture(descriptionShort="Bridges frontend requests to Tauri backend commands")
import { invoke } from "@tauri-apps/api/core";
import { ProjectGraph } from "../../../domain/graph";
import {
  AnalysisClient,
  AnalyzeProjectOptions,
  ProjectSearchResult,
} from "./analysis-client";

/** Calls the Rust `analyze_project` command over Tauri IPC for a real folder. */
export function createTauriAnalysisClient(): AnalysisClient {
  return {
    async analyzeProject(path: string, options: AnalyzeProjectOptions): Promise<ProjectGraph> {
      return invoke<ProjectGraph>("analyze_project", {
        path,
        metricsWindowDays: options.metricsWindowDays,
        hideTopLevelDotDirs: options.hideTopLevelDotDirs,
      });
    },
    async readModuleSource(root: string, path: string): Promise<string> {
      return invoke<string>("read_module_source", { root, path });
    },
    async searchModuleSources(
      root: string,
      query: string,
      modulePaths: string[],
    ): Promise<ProjectSearchResult> {
      return invoke<ProjectSearchResult>("search_module_sources", { root, query, modulePaths });
    },
  };
}
