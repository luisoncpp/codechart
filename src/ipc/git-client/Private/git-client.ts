// @Architecture(descriptionShort="Defines the abstract interface for the git client")
export interface GitCommit {
  hash: string;
  message: string;
  date: string;
}

export const LOCAL_CHANGES_REF = "__codechart_local_changes__";

export interface GitProjectSnapshot {
  graph: import("../../../domain/graph").ProjectGraph;
  sources: Record<string, string>;
}

export interface GitSnapshotInput {
  path: string;
  gitRef: string;
  modulePaths: string[];
  hideTopLevelDotDirs: boolean;
}

export interface WorkingTreeDiffInput {
  path: string;
  baseRef: string;
  eligiblePaths: string[];
  ignoreSubmodules: boolean;
}

export interface GitClient {
  isGitRepo(path: string): Promise<boolean>;
  listCommits(path: string, limit: number): Promise<GitCommit[]>;
  loadProjectSnapshot(input: GitSnapshotInput): Promise<GitProjectSnapshot>;
  diffRefs(path: string, baseRef: string, headRef: string): Promise<string>;
  diffWorkingTree(input: WorkingTreeDiffInput): Promise<string>;
  listSubmodulePaths(path: string): Promise<string[]>;
}
