import { ProjectGraph } from "../../domain/graph";

export interface AnalysisClient {
  analyzeProject(path: string): Promise<ProjectGraph>;
}

export { createMockAnalysisClient } from "./Private/mock-analysis-client";
export { createTauriAnalysisClient } from "./Private/tauri-analysis-client";
