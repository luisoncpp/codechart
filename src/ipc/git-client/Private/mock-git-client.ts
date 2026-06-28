import golden from "../../../../tests/fixtures/golden/project-graph.json";
import type { ProjectGraph } from "../../../domain/graph";
import type { GitClient } from "./git-client";

export function createMockGitClient(): GitClient {
  return {
    async isGitRepo(): Promise<boolean> {
      return false;
    },
    async listCommits(): Promise<[]> {
      return [];
    },
    async analyzeProjectAtRef(): Promise<ProjectGraph> {
      return golden as unknown as ProjectGraph;
    },
    async diffRefs(): Promise<string> {
      return "";
    },
  };
}
