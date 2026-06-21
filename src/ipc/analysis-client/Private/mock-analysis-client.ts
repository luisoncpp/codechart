import goldenGraph from "../../../../tests/fixtures/golden/project-graph.json";
import { ProjectGraph } from "../../../domain/graph";
import { AnalysisClient } from "./analysis-client";

/**
 * Returns the golden fixture so the whole UI runs with zero Rust.
 * Drives the Phase 6 visual gate (render the sample side-by-side).
 */
export function createMockAnalysisClient(): AnalysisClient {
  return {
    async analyzeProject(): Promise<ProjectGraph> {
      return goldenGraph as unknown as ProjectGraph;
    },
  };
}
