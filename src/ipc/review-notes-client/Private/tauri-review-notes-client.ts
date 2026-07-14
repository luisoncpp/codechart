import { invoke } from "@tauri-apps/api/core";
import type { ReviewNotesClient, ReviewNotesDocument } from "./review-notes-client";

export function createTauriReviewNotesClient(): ReviewNotesClient {
  return {
    loadReviewNotes(root, modulePaths) {
      return invoke<ReviewNotesDocument>("load_review_notes", { root, modulePaths });
    },
    async saveReviewNotes(root, document) {
      await invoke("save_review_notes", { root, document });
    },
  };
}
