// @Architecture(descriptionShort="Tracks reviewed files of the active diff with serialized persistence")
import type { DiffReviewClient } from "../../../ipc/diff-review-client";

const NO_REVIEW: DiffReviewClient = {
  loadDiffReview: async () => [],
  saveDiffReview: async () => {},
  clearDiffReviews: async () => {},
};

/**
 * Reviewed-file set for the active diff overlay. Loads reconciled state when a
 * diff is applied, flips paths on toggle with serialized saves, and clears on
 * diff stop (persistence survives: re-applying the same diff restores marks).
 * The set is replaced immutably so memoized projections invalidate by identity.
 */
export class DiffReviewTracker {
  private reviewed: ReadonlySet<string> = new Set();
  private reviewId: string | null = null;
  private root: string | null = null;
  private error: string | null = null;
  private saveInFlight = false;
  private inFlightSave: Promise<void> | null = null;
  private pending: ReadonlySet<string> | null = null;

  constructor(private client: DiffReviewClient = NO_REVIEW) {}

  getReviewed = () => this.reviewed;
  getError = () => this.error;

  /** Load persisted marks for the diff, reconciled against its current files. */
  async activate(root: string, reviewId: string, diffPaths: Iterable<string>): Promise<void> {
    this.root = root;
    this.reviewId = reviewId;
    this.pending = null;
    try {
      this.reviewed = new Set(await this.client.loadDiffReview(root, reviewId, [...diffPaths]));
      this.error = null;
    } catch (e) {
      this.reviewed = new Set();
      this.error = e instanceof Error ? e.message : String(e);
    }
  }

  clear() {
    this.reviewed = new Set();
    this.reviewId = null;
    this.root = null;
    this.error = null;
    this.pending = null;
  }

  /** Flip one module's reviewed mark; returns the new set (or null if inactive). */
  toggle(moduleId: string): ReadonlySet<string> | null {
    if (!this.reviewId) return null;
    const next = new Set(this.reviewed);
    if (next.has(moduleId)) next.delete(moduleId);
    else next.add(moduleId);
    this.reviewed = next;
    this.pending = next;
    this.persist();
    return this.reviewed;
  }

  /** Unmark every reviewed file; returns the new set (or null if inactive or already empty). */
  unmarkAll(): ReadonlySet<string> | null {
    if (!this.reviewId || this.reviewed.size === 0) return null;
    this.reviewed = new Set();
    this.pending = this.reviewed;
    this.persist();
    return this.reviewed;
  }

  /**
   * Wipe every persisted entry (all diffs) plus the active set; the diff id
   * stays active so later toggles save fresh entries. Throws on save failure.
   */
  async clearAll(): Promise<boolean> {
    if (!this.root) return false;
    // A queued save finishing after the wipe would resurrect an entry.
    await this.inFlightSave;
    this.pending = null;
    try {
      await this.client.clearDiffReviews(this.root);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      throw e;
    }
    this.error = null;
    this.reviewed = new Set();
    return true;
  }

  private persist() {
    this.inFlightSave = this.flushSave().finally(() => {
      this.inFlightSave = null;
    });
  }

  private async flushSave() {
    if (this.saveInFlight || !this.pending || !this.root || !this.reviewId) return;
    const snapshot = this.pending;
    this.pending = null;
    this.saveInFlight = true;
    try {
      await this.client.saveDiffReview(this.root, this.reviewId, [...snapshot]);
      this.error = null;
    } catch (e) {
      this.pending = snapshot;
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.saveInFlight = false;
    }
    if (this.pending && this.error === null) await this.flushSave();
  }
}
