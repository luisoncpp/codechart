// @Architecture(descriptionShort="Tauri IPC implementation of the git client")
import { invoke } from "@tauri-apps/api/core";
import type { ProjectGraph } from "../../../domain/graph";
import type { GitClient, GitCommit } from "./git-client";

export function createTauriGitClient(): GitClient {
  return {
    async isGitRepo(path: string): Promise<boolean> {
      return invoke<boolean>("git_is_repo", { path });
    },
    async listCommits(path: string, limit: number): Promise<GitCommit[]> {
      return invoke<GitCommit[]>("git_list_commits", { path, limit });
    },
    async analyzeProjectAtRef(path: string, gitRef: string): Promise<ProjectGraph> {
      return invoke<ProjectGraph>("analyze_project_at_ref", { path, gitRef });
    },
    async diffRefs(path: string, baseRef: string, headRef: string): Promise<string> {
      return invoke<string>("git_diff_refs", { path, baseRef, headRef });
    },
  };
}
