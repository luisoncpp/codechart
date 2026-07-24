// @Architecture(descriptionShort="Core types for graph diff overlays and parsed path sets")
import type { Edge, ModuleNode, ProjectGraph } from "../../graph";
import type { FileLineDiff } from "./line-diff-types";

/** Overlay derived from comparing a before/after graph or parsing a unified diff. */
export interface GraphDiffOverlay {
  affectedModuleIds: ReadonlySet<string>;
  deletedModuleIds: ReadonlySet<string>;
  addedSymbolIds: ReadonlySet<string>;
  removedSymbolIds: ReadonlySet<string>;
  modifiedSymbolIds: ReadonlySet<string>;
  addedEdgeIds: ReadonlySet<string>;
  removedEdges: Edge[];
  /** Deleted modules from the before graph, rendered as ghost boxes. */
  ghostModules: ModuleNode[];
  /** Layout of the before graph — positions ghost modules. */
  beforeLayout: import("../../layout").LayoutedGraph | null;
  /** Unified diff text used for line-level highlights in code panels. */
  unifiedDiff: string | null;
  /** Per repo-relative path line add/remove maps. */
  lineDiffByPath: ReadonlyMap<string, FileLineDiff>;
  /**
   * After-snapshot source per repo-relative path. Line highlights index the
   * after snapshot, so panels must render this exact text (not the live file,
   * which may have drifted since the diff was computed). Empty in paste mode.
   */
  afterSourceByPath: ReadonlyMap<string, string>;
}

export interface ParsedDiffPaths {
  modified: string[];
  deleted: string[];
  added: string[];
}

export interface GraphDiffInput {
  before: ProjectGraph;
  after: ProjectGraph;
}

/** Graph diff without line-level parse (added by `attachLineDiff`). */
export type GraphDiffCore = Omit<
  GraphDiffOverlay,
  "unifiedDiff" | "lineDiffByPath" | "afterSourceByPath"
>;
