// @Architecture(descriptionShort="Defines the abstract interface for the git client")
export interface GitCommit {
  hash: string;
  message: string;
  date: string;
}

export const LOCAL_CHANGES_REF = "__codechart_local_changes__";

export interface GitClient {
  isGitRepo(path: string): Promise<boolean>;
  listCommits(path: string, limit: number): Promise<GitCommit[]>;
  analyzeProjectAtRef(path: string, gitRef: string): Promise<import("../../../domain/graph").ProjectGraph>;
  diffRefs(path: string, baseRef: string, headRef: string): Promise<string>;
  diffWorkingTree(path: string, baseRef: string, eligiblePaths: string[]): Promise<string>;
}
