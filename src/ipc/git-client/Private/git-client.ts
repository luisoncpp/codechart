// @Architecture(descriptionShort="Defines the abstract interface for the git client")
export interface GitCommit {
  hash: string;
  message: string;
  date: string;
}

export interface GitClient {
  isGitRepo(path: string): Promise<boolean>;
  listCommits(path: string, limit: number): Promise<GitCommit[]>;
  analyzeProjectAtRef(path: string, gitRef: string): Promise<import("../../../domain/graph").ProjectGraph>;
  diffRefs(path: string, baseRef: string, headRef: string): Promise<string>;
}
