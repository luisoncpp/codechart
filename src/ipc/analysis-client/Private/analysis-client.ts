// @Architecture(descriptionShort="Defines the abstract interface for the analyzer client")
import { ProjectGraph } from "../../../domain/graph";

export const DEFAULT_METRICS_WINDOW_DAYS = 90;

/** Options for a full-project analysis (metrics window + file filters). */
export interface AnalyzeProjectOptions {
  metricsWindowDays: number;
  /** Drop files under top-level directories whose names start with `.`. */
  hideTopLevelDotDirs: boolean;
}

/** One full-text hit: a line of a module's source. Mirrors Rust `SearchMatch`. */
export interface ProjectSearchMatch {
  path: string;
  /** 1-based line number in the module's source. */
  line: number;
  /** The matching line, trimmed and clipped by the backend. */
  lineText: string;
}

/** Mirrors Rust `SearchResult` (`src-tauri/src/search`). */
export interface ProjectSearchResult {
  matches: ProjectSearchMatch[];
  /** True when the backend stopped at its match cap; more matches exist. */
  truncated: boolean;
}

export interface AnalysisClient {
  analyzeProject(path: string, options: AnalyzeProjectOptions): Promise<ProjectGraph>;
  /**
   * Read one module's source for the L2 semantic-zoom snippet (Phase 10).
   * `root` is the analyzed folder, `path` the module's repo-relative id. Fetched
   * lazily so the `ProjectGraph` contract never carries file bodies.
   */
  readModuleSource(root: string, path: string): Promise<string>;
  /** Case-insensitive substring search over the given modules' sources. */
  searchModuleSources(
    root: string,
    query: string,
    modulePaths: string[],
  ): Promise<ProjectSearchResult>;
}
