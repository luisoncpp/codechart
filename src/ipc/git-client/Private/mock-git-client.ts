// @Architecture(descriptionShort="Mock git client using static fixtures for tests and web dev")
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
    async loadProjectSnapshot() {
      return { graph: golden as unknown as ProjectGraph, sources: {} };
    },
    async diffRefs(): Promise<string> {
      return "";
    },
    async diffWorkingTree(): Promise<string> {
      return "";
    },
    async listSubmodulePaths(): Promise<string[]> {
      return [];
    },
  };
}
