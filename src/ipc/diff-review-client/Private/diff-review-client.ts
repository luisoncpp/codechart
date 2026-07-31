/**
 * Persistence seam for diff review progress: which files of one diff were
 * already reviewed. `diffId` identifies the diff (`commits:a..b`,
 * `working-tree:base`, `paste:<hash>`); paths are project-relative POSIX.
 */
export interface DiffReviewClient {
  /** Reviewed paths reconciled against the diff's current paths (stale dropped). */
  loadDiffReview(root: string, diffId: string, diffPaths: string[]): Promise<string[]>;
  saveDiffReview(root: string, diffId: string, reviewedPaths: string[]): Promise<void>;
  /** Wipe every persisted diff review entry (settings "clear review info"). */
  clearDiffReviews(root: string): Promise<void>;
}
