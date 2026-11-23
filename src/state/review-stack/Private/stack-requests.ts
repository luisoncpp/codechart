// @Architecture(descriptionShort="One-shot Review Stack UI requests (navigate to code, open a cohort explanation) consumed by the canvas")
import type { ReviewCohort } from "../../../ipc/review-stack-client";

export interface StackNavigationRequest {
  seq: number;
  path: string;
  line?: number;
  symbol?: string;
  openPreview: boolean;
}

/** One-shot request to open a cohort's markdown explanation in a preview frame. */
export interface ExplanationRequest {
  seq: number;
  cohortId: string;
  title: string;
  markdown: string;
}

/**
 * Retained until the canvas consumes the matching `seq`, so an effect that
 * re-runs for unrelated reasons cannot replay it.
 */
export class StackRequests {
  private seq = 0;
  navigation: StackNavigationRequest | null = null;
  explanation: ExplanationRequest | null = null;

  navigate(req: { path: string; line?: number; symbol?: string; openPreview?: boolean }) {
    this.navigation = { ...req, seq: ++this.seq, openPreview: req.openPreview ?? true };
  }

  /** False when the cohort has no explanation to show. */
  explain(cohort: ReviewCohort | undefined): boolean {
    if (!cohort?.explanation?.trim()) return false;
    this.explanation = {
      seq: ++this.seq,
      cohortId: cohort.id,
      title: cohort.title,
      markdown: cohort.explanation,
    };
    return true;
  }

  consumeNavigation(seq: number) {
    if (this.navigation?.seq === seq) this.navigation = null;
  }

  consumeExplanation(seq: number) {
    if (this.explanation?.seq === seq) this.explanation = null;
  }

  clear() {
    this.navigation = null;
    this.explanation = null;
  }
}
