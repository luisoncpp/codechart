import { invoke } from "@tauri-apps/api/core";
import type { DiffReviewClient } from "./diff-review-client";

export function createTauriDiffReviewClient(): DiffReviewClient {
  return {
    loadDiffReview(root, diffId, diffPaths) {
      return invoke<string[]>("load_diff_review", { root, diffId, diffPaths });
    },
    async saveDiffReview(root, diffId, reviewedPaths) {
      await invoke("save_diff_review", { root, diffId, reviewedPaths });
    },
  };
}
