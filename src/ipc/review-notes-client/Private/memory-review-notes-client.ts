import type { ReviewNotesClient, ReviewNotesDocument } from "./review-notes-client";

export function createMemoryReviewNotesClient(initial?: ReviewNotesDocument): ReviewNotesClient {
  let document = initial ?? { version: 1, notes: [] };
  return {
    async loadReviewNotes() { return document; },
    async saveReviewNotes(_root, next) { document = next; },
  };
}
