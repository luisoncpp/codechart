// @Architecture(descriptionShort="Mock analysis client using static fixtures for web development")
import goldenGraph from "../../../../tests/fixtures/golden/project-graph.json";
import { ProjectGraph } from "../../../domain/graph";
import { AnalysisClient } from "./analysis-client";

// The fixture project's source, bundled at build time so the L2 snippet path
// runs with zero Rust (jsdom/browser have no fs). Keyed by glob path; matched by
// repo-relative suffix below.
const FIXTURE_SOURCES = import.meta.glob(
  "../../../../tests/fixtures/ts-basic-project/**/*.{ts,tsx,md}",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

/**
 * Returns the golden fixture so the whole UI runs with zero Rust.
 * Drives the Phase 6 visual gate (render the sample side-by-side) and the
 * Phase 10 L2 snippet (real fixture source via `readModuleSource`).
 */
export function createMockAnalysisClient(): AnalysisClient {
  return {
    async analyzeProject(): Promise<ProjectGraph> {
      return goldenGraph as unknown as ProjectGraph;
    },
    async readModuleSource(_root: string, path: string): Promise<string> {
      const entry = Object.entries(FIXTURE_SOURCES).find(([key]) =>
        key.endsWith(`/${path}`),
      );
      return entry?.[1] ?? `// ${path}`;
    },
  };
}
