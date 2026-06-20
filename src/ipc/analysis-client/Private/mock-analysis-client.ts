import { ProjectGraph } from "../../../domain/graph";
import { AnalysisClient } from "../index";

export function createMockAnalysisClient(): AnalysisClient {
  return {
    async analyzeProject(): Promise<ProjectGraph> {
      return {
        version: 1,
        root: "/mock",
        groups: [
          {
            id: "core",
            label: "Core",
            parentId: null,
            color: "#3b82f6",
            facadeModuleIds: ["src/index.ts"],
          },
        ],
        modules: [
          {
            id: "src/index.ts",
            path: "src/index.ts",
            label: "index.ts",
            language: "typescript",
            groupId: "core",
            isFacade: true,
            metrics: { loc: 5 },
          },
        ],
        edges: [],
        diagnostics: [],
      };
    },
  };
}
