// @Architecture(descriptionShort="Pure Review Stack record mutations (stack replace, finding/diff-note upsert, cohort membership)")
import type {
  AgentDiffNote,
  CohortHunk,
  FindingStatus,
  ReviewBlocker,
  ReviewCohort,
  ReviewFinding,
  ReviewStackRecord,
} from "../../../ipc/review-stack-client";

export interface StackInput {
  title: string;
  summary: string;
  cohorts: ReviewCohort[];
  blockers: ReviewBlocker[];
}

export function emptyStack(diffId: string): ReviewStackRecord {
  return { diffId, title: "MR Review", summary: "", cohorts: [], blockers: [], findings: [], diffNotes: [] };
}

/** Replaces the authored structure; findings and diff notes survive a re-plan. */
export function replaceStack(
  diffId: string,
  previous: ReviewStackRecord | null,
  input: StackInput,
): ReviewStackRecord {
  return {
    diffId,
    ...input,
    findings: previous?.findings ?? [],
    diffNotes: previous?.diffNotes ?? [],
  };
}

/** Re-sending an id updates that item in place; new ids append. */
function upsertById<T extends { id: string }>(existing: readonly T[], incoming: readonly T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

export function withFindings(stack: ReviewStackRecord, findings: ReviewFinding[]): ReviewStackRecord {
  const normalized = findings.map((f) => ({ ...f, status: f.status ?? "open" }));
  return { ...stack, findings: upsertById(stack.findings, normalized) };
}

export function withDiffNotes(stack: ReviewStackRecord, notes: AgentDiffNote[]): ReviewStackRecord {
  const normalized = notes.map((n) => ({ ...n, side: n.side ?? "after" }));
  return { ...stack, diffNotes: upsertById(stack.diffNotes ?? [], normalized) };
}

/** Null when no finding has that id. */
export function withFindingStatus(
  stack: ReviewStackRecord,
  findingId: string,
  status: FindingStatus,
): ReviewStackRecord | null {
  if (!stack.findings.some((f) => f.id === findingId)) return null;
  const findings = stack.findings.map((f) => (f.id === findingId ? { ...f, status } : f));
  return { ...stack, findings };
}

/** Whole-file members plus every file a hunk touches (module id == path), in first-seen order. */
export function cohortModuleIds(cohort: ReviewCohort): string[] {
  return [...new Set([...cohort.moduleIds, ...(cohort.hunks ?? []).map((h) => h.path)])];
}

/** First file to focus when the cohort is spotlighted. */
export function cohortFocusPath(cohort: ReviewCohort): string | undefined {
  return cohort.hunks?.[0]?.path ?? cohort.moduleIds[0];
}

export function cohortHunksFor(cohort: ReviewCohort, path: string): CohortHunk[] {
  return (cohort.hunks ?? []).filter((h) => h.path === path);
}
