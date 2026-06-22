// @Architecture(descriptionShort="Defines the abstract interface for the analyzer client")
import { ProjectGraph } from "../../../domain/graph";

export interface AnalysisClient {
  analyzeProject(path: string): Promise<ProjectGraph>;
  /**
   * Read one module's source for the L2 semantic-zoom snippet (Phase 10).
   * `root` is the analyzed folder, `path` the module's repo-relative id. Fetched
   * lazily so the `ProjectGraph` contract never carries file bodies.
   */
  readModuleSource(root: string, path: string): Promise<string>;
}
