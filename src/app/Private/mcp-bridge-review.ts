// @Architecture(descriptionShort="MCP bridge RPC methods that author and read the Review Stack (cohorts, findings, agent Diff Notes, review state)")
import type {
  AgentDiffNote,
  FindingStatus,
  ReviewBlocker,
  ReviewCohort,
  ReviewFinding,
  ReviewStackClient,
} from "../../ipc/review-stack-client";
import type { GraphSessionStore } from "../../state/graph-session";
import type { ReviewNotesStore } from "../../state/review-notes";
import {
  cohortFocusPath,
  cohortModuleIds,
  type ReviewStackStore,
  type SpotlightMode,
} from "../../state/review-stack";

export interface McpBridgeDeps {
  session: GraphSessionStore;
  reviewNotes: ReviewNotesStore;
  reviewStack: ReviewStackStore;
  client: ReviewStackClient;
}

type Params = Record<string, unknown>;

export function setReviewStack(deps: McpBridgeDeps, p: Params) {
  return deps.reviewStack.setStack({
    title: String(p.title ?? "MR Review"),
    summary: String(p.summary ?? ""),
    cohorts: arrayParam<ReviewCohort>(p.cohorts),
    blockers: arrayParam<ReviewBlocker>(p.blockers),
  });
}

export async function upsertFindings(deps: McpBridgeDeps, p: Params) {
  const saved = await deps.reviewStack.upsertFindings(arrayParam<ReviewFinding>(p.findings));
  return { count: saved.length, findings: saved };
}

export async function upsertDiffNotes(deps: McpBridgeDeps, p: Params) {
  const saved = await deps.reviewStack.upsertDiffNotes(arrayParam<AgentDiffNote>(p.notes));
  return { count: saved.length, diffNotes: saved };
}

/** Spotlight a cohort, focus its first changed file, and (by default) open its explanation frame. */
export async function focusLayer(deps: McpBridgeDeps, p: Params) {
  const { reviewStack, session } = deps;
  const cohortId = typeof p.cohortId === "string" && p.cohortId.trim() ? p.cohortId : null;
  const mode = (typeof p.spotlight === "string" ? p.spotlight : "dim-others") as SpotlightMode;
  reviewStack.focusCohort(cohortId, mode);
  const cohort = reviewStack.getStack()?.cohorts.find((c) => c.id === cohortId);
  const focusPath = cohort ? cohortFocusPath(cohort) : undefined;
  if (focusPath) await session.focusOn(focusPath);
  const explanationOpened =
    cohortId !== null && p.openExplanation !== false && reviewStack.requestExplanation(cohortId);
  return {
    activeCohortId: cohortId,
    spotlight: mode,
    moduleIds: cohort ? cohortModuleIds(cohort) : [],
    explanationOpened,
  };
}

export function getReviewState(deps: McpBridgeDeps, includeResolved: boolean) {
  const { session, reviewNotes, reviewStack } = deps;
  const overlay = session.getDiffOverlay();
  const allDiffPaths = overlay
    ? [...new Set([...overlay.affectedModuleIds, ...overlay.deletedModuleIds])]
    : [];
  const reviewed = session.getDiffReviewedIds();
  const stack = reviewStack.getStack();
  return {
    diffId: session.getActiveDiffId(),
    reviewedPaths: [...reviewed],
    unreviewedPaths: allDiffPaths.filter((path) => !reviewed.has(path)),
    reviewNotes: reviewNotes.getDocument()?.notes ?? [],
    findings: (stack?.findings ?? []).filter((f) => includeResolved || f.status === "open"),
    diffNotes: stack?.diffNotes ?? [],
    cohorts: stack?.cohorts ?? [],
  };
}

export function setFilesReviewed(deps: McpBridgeDeps, p: Params) {
  const paths = Array.isArray(p.paths) ? p.paths.map(String) : [];
  deps.session.setDiffReviewed(paths, Boolean(p.reviewed));
  return { reviewedPaths: [...deps.session.getDiffReviewedIds()] };
}

export async function resolveFinding(deps: McpBridgeDeps, p: Params) {
  const id = String(p.findingId ?? "");
  const status = String(p.status ?? "resolved") as FindingStatus;
  const updated = await deps.reviewStack.resolveFinding(id, status);
  return { updated, findingId: id, status };
}

function arrayParam<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
