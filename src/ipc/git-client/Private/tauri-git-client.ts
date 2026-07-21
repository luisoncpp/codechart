// @Architecture(descriptionShort="Tauri IPC implementation of the git client")
import { invoke } from "@tauri-apps/api/core";
import type {
  GitClient,
  GitCommit,
  GitProjectSnapshot,
  GitSnapshotInput,
} from "./git-client";

export function createTauriGitClient(): GitClient {
  return {
    async isGitRepo(path: string): Promise<boolean> {
      return invoke<boolean>("git_is_repo", { path });
    },
    async listCommits(path: string, limit: number): Promise<GitCommit[]> {
      return invoke<GitCommit[]>("git_list_commits", { path, limit });
    },
    async loadProjectSnapshot(input: GitSnapshotInput): Promise<GitProjectSnapshot> {
      return invoke<GitProjectSnapshot>("load_project_snapshot", {
        path: input.path,
        gitRef: input.gitRef,
        modulePaths: input.modulePaths,
      });
    },
    async diffRefs(path: string, baseRef: string, headRef: string): Promise<string> {
      return invoke<string>("git_diff_refs", { path, baseRef, headRef });
    },
    async diffWorkingTree(
      path: string,
      baseRef: string,
      eligiblePaths: string[],
    ): Promise<string> {
      return invoke<string>("git_diff_working_tree", { path, baseRef, eligiblePaths });
    },
  };
}
