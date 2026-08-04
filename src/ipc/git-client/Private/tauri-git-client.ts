// @Architecture(descriptionShort="Tauri IPC implementation of the git client")
import { invoke } from "@tauri-apps/api/core";
import type {
  GitClient,
  GitCommit,
  GitProjectSnapshot,
  GitSnapshotInput,
  WorkingTreeDiffInput,
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
        hideTopLevelDotDirs: input.hideTopLevelDotDirs,
      });
    },
    async diffRefs(path: string, baseRef: string, headRef: string): Promise<string> {
      return invoke<string>("git_diff_refs", { path, baseRef, headRef });
    },
    async diffWorkingTree(input: WorkingTreeDiffInput): Promise<string> {
      return invoke<string>("git_diff_working_tree", {
        path: input.path,
        baseRef: input.baseRef,
        eligiblePaths: input.eligiblePaths,
        ignoreSubmodules: input.ignoreSubmodules,
      });
    },
    async listSubmodulePaths(path: string): Promise<string[]> {
      return invoke<string[]>("git_list_submodule_paths", { path });
    },
  };
}
