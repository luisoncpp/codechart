// @Architecture(descriptionShort="Shared TypeScript types for Review Stacks, diff impact, and MCP bridge")
import type { Diagnostic, ProjectGraph } from "../../../domain/graph";

export type FindingSeverity = "critical" | "major" | "minor" | "trivial" | "info";
export type FindingSide = "before" | "after";
export type FindingStatus = "open" | "resolved" | "dismissed";

/** A line range a cohort covers; one file may be split across cohorts. */
export interface CohortHunk {
  path: string;
  side: FindingSide;
  startLine: number;
  endLine: number;
}

export interface ReviewCohort {
  id: string;
  title: string;
  /** Short markdown summary shown in the drawer. */
  rationale: string;
  dependsOn: string[];
  /** Whole-file members (optional when `hunks` covers them). */
  moduleIds: string[];
  /** Markdown walkthrough opened in its own preview frame. */
  explanation?: string;
  hunks?: CohortHunk[];
}

/** Agent-authored Diff Note: read-only markdown rendered under its line range. */
export interface AgentDiffNote {
  id: string;
  path: string;
  side: FindingSide;
  startLine: number;
  endLine: number;
  body: string;
}

export interface ReviewBlocker {
  id: string;
  title: string;
  description: string;
  findingId?: string | null;
  moduleId?: string | null;
}

export interface ReviewFinding {
  id: string;
  path: string;
  side: FindingSide;
  startLine: number;
  endLine: number;
  severity: FindingSeverity;
  category: string;
  title: string;
  body: string;
  layerId?: string | null;
  blocker: boolean;
  suggestedFix?: string | null;
  status: FindingStatus;
}

export interface ReviewStackRecord {
  diffId: string;
  title: string;
  summary: string;
  cohorts: ReviewCohort[];
  blockers: ReviewBlocker[];
  findings: ReviewFinding[];
  diffNotes?: AgentDiffNote[];
}

export interface TopoLayer {
  index: number;
  moduleIds: string[];
  dependsOnLayers: number[];
  groupIds: string[];
  /** True when the layer holds a multi-module import cycle (one SCC). */
  cyclic: boolean;
}

export interface BlastRadiusEntry {
  moduleId: string;
  depth: number;
  groupId?: string | null;
  viaModuleIds: string[];
}

export interface DiffImpactReport {
  changedModuleIds: string[];
  layers: TopoLayer[];
  blastRadius: BlastRadiusEntry[];
  affectedGroupIds: string[];
  newDiagnostics: Diagnostic[];
  /** False when no before-graph was available (paste diffs), so `newDiagnostics: []` is not "clean". */
  newDiagnosticsAvailable?: boolean;
}

export interface BridgeRpcRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface ReviewStackClient {
  loadStack(root: string, diffId: string): Promise<ReviewStackRecord | null>;
  saveStack(root: string, stack: ReviewStackRecord): Promise<void>;
  deleteStack(root: string, diffId: string): Promise<void>;
  clearStacks(root: string): Promise<void>;
  analyzeDiffImpact(args: {
    before?: ProjectGraph | null;
    after: ProjectGraph;
    changedModuleIds: string[];
    maxDepth?: number;
  }): Promise<DiffImpactReport>;
  computeBlastRadius(args: {
    graph: ProjectGraph;
    seedIds: string[];
    maxDepth?: number;
  }): Promise<[BlastRadiusEntry[], string[]]>;
  respondToBridge(id: string, result: unknown, error?: string | null): Promise<boolean>;
}
