import type { DiffReviewClient } from "./diff-review-client";

export function createMemoryDiffReviewClient(initial?: Record<string, string[]>): DiffReviewClient {
  const reviews = new Map(Object.entries(initial ?? {}));
  return {
    async loadDiffReview(_root, diffId, diffPaths) {
      const current = new Set(diffPaths);
      return (reviews.get(diffId) ?? []).filter((path) => current.has(path));
    },
    async saveDiffReview(_root, diffId, reviewedPaths) {
      reviews.set(diffId, [...reviewedPaths]);
    },
    async clearDiffReviews() {
      reviews.clear();
    },
  };
}
