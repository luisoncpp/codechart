import { ProjectGraph } from "../../../domain/graph";

export interface AnalysisClient {
  analyzeProject(path: string): Promise<ProjectGraph>;
}
