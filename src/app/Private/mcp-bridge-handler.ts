// @Architecture(descriptionShort="Dispatches incoming MCP bridge RPC methods against live CodeChart stores")
import type {
  BridgeRpcRequest,
  FindingStatus,
  ReviewBlocker,
  ReviewCohort,
  ReviewFinding,
  ReviewStackClient,
} from "../../ipc/review-stack-client";
import type { GraphSessionStore } from "../../state/graph-session";
import type { ReviewNotesStore } from "../../state/review-notes";
import type { ReviewStackStore, SpotlightMode } from "../../state/review-stack";
import { requestDiffImpact } from "./request-diff-impact";

export interface McpBridgeDeps {
  session: GraphSessionStore;
  reviewNotes: ReviewNotesStore;
  reviewStack: ReviewStackStore;
  client: ReviewStackClient;
}

export class McpBridgeHandler {
  constructor(private readonly deps: McpBridgeDeps) {}

  async handle(req: BridgeRpcRequest): Promise<unknown> {
    const p = req.params ?? {};
    switch (req.method) {
      case "get_active_context":
        return this.getActiveContext();
      case "get_architecture_summary":
        return this.getArchitectureSummary(asOptionalString(p.groupId));
      case "load_diff":
        return this.loadDiff(p);
      case "analyze_diff_impact":
        return this.analyzeDiffImpact(p);
      case "set_review_stack":
        return this.setReviewStack(p);
      case "upsert_findings":
        return this.upsertFindings(p);
      case "clear_review_stack":
        await this.deps.reviewStack.clearStack();
        return { cleared: true };
      case "focus_layer":
        return this.focusLayer(p);
      case "show_blast_radius":
        return this.showBlastRadius(p);
      case "navigate_to":
        return this.navigateTo(p);
      case "get_review_state":
        return this.getReviewState(Boolean(p.includeResolved));
      case "set_files_reviewed":
        return this.setFilesReviewed(p);
      case "resolve_finding":
        return this.resolveFinding(p);
      default:
        throw new Error(`Unknown MCP bridge method: ${req.method}`);
    }
  }

  private getActiveContext() {
    const { session, reviewStack } = this.deps;
    const overlay = session.getDiffOverlay();
    const diffTotal = overlay
      ? new Set([...overlay.affectedModuleIds, ...overlay.deletedModuleIds]).size
      : 0;
    return {
      projectRoot: session.getProjectRoot(),
      phase: session.getPhase(),
      zoomLevel: session.getZoomLevel(),
      selectedId: session.getSelectedId(),
      diffActive: Boolean(overlay),
      diffId: session.getActiveDiffId(),
      diffReviewedCount: session.getDiffReviewedIds().size,
      diffTotalCount: diffTotal,
      activeCohortId: reviewStack.getActiveCohortId(),
      blastRadiusRoot: reviewStack.getBlastRadius()?.rootModuleId ?? null,
    };
  }

  private getArchitectureSummary(groupId?: string) {
    const graph = this.deps.session.getGraph();
    if (!graph) throw new Error("No project is currently loaded in CodeChart.");
    const groups = groupId
      ? graph.groups.filter((g) => g.id === groupId || g.parentId === groupId)
      : graph.groups;
    return {
      root: graph.root,
      groups: groups.map((g) => ({
        id: g.id,
        label: g.label,
        parentId: g.parentId,
        facadeModuleIds: g.facadeModuleIds,
        tags: g.tags,
        descriptionShort: g.annotation?.descriptionShort ?? null,
      })),
      moduleCount: graph.modules.length,
      edgeCount: graph.edges.length,
      diagnostics: graph.diagnostics,
    };
  }

  private async loadDiff(p: Record<string, unknown>) {
    const { session, reviewStack } = this.deps;
    const mode = String(p.mode ?? "working-tree");
    if (mode === "commits") {
      await session.applyDiffFromCommits(String(p.baseRef ?? "HEAD~1"), String(p.headRef ?? "HEAD"));
    } else if (mode === "paste") {
      await session.applyDiffFromPaste(String(p.diffText ?? ""));
    } else {
      await session.applyDiffFromWorkingTree(String(p.baseRef ?? "HEAD"));
    }
    const err = session.getDiffError();
    if (err) throw new Error(err);
    const root = session.getProjectRoot();
    const diffId = session.getActiveDiffId();
    if (root && diffId) await reviewStack.activateDiff(root, diffId);
    const overlay = session.getDiffOverlay();
    return {
      diffId,
      affectedModuleIds: overlay ? [...overlay.affectedModuleIds] : [],
      deletedModuleIds: overlay ? [...overlay.deletedModuleIds] : [],
    };
  }

  private async analyzeDiffImpact(p: Record<string, unknown>) {
    const { session, reviewStack, client } = this.deps;
    if (p.mode) await this.loadDiff(p);
    const maxDepth = typeof p.maxDepth === "number" ? p.maxDepth : 3;
    const report = await requestDiffImpact(session, client, maxDepth);
    reviewStack.setImpact(report);
    return report;
  }

  private async setReviewStack(p: Record<string, unknown>) {
    return this.deps.reviewStack.setStack({
      title: String(p.title ?? "MR Review"),
      summary: String(p.summary ?? ""),
      cohorts: Array.isArray(p.cohorts) ? (p.cohorts as ReviewCohort[]) : [],
      blockers: Array.isArray(p.blockers) ? (p.blockers as ReviewBlocker[]) : [],
    });
  }

  private async upsertFindings(p: Record<string, unknown>) {
    const findings = Array.isArray(p.findings) ? (p.findings as ReviewFinding[]) : [];
    const saved = await this.deps.reviewStack.upsertFindings(findings);
    return { count: saved.length, findings: saved };
  }

  private async focusLayer(p: Record<string, unknown>) {
    const cohortId = asOptionalString(p.cohortId) ?? null;
    const mode = (asOptionalString(p.spotlight) as SpotlightMode | undefined) ?? "dim-others";
    this.deps.reviewStack.focusCohort(cohortId, mode);
    const cohort = this.deps.reviewStack.getStack()?.cohorts.find((c) => c.id === cohortId);
    if (cohort?.moduleIds[0]) await this.deps.session.focusOn(cohort.moduleIds[0]);
    return { activeCohortId: cohortId, spotlight: mode, moduleIds: cohort?.moduleIds ?? [] };
  }

  private async showBlastRadius(p: Record<string, unknown>) {
    const { session, reviewStack, client } = this.deps;
    const graph = session.getGraph();
    if (!graph) throw new Error("No project loaded.");
    const moduleId = asOptionalString(p.moduleId);
    const seeds = moduleId ? [moduleId] : [...(session.getDiffOverlay()?.affectedModuleIds ?? [])];
    if (seeds.length === 0) {
      reviewStack.clearBlastRadius();
      return { entries: [], affectedGroupIds: [] };
    }
    const maxDepth = typeof p.maxDepth === "number" ? p.maxDepth : 3;
    const [entries, affectedGroupIds] = await client.computeBlastRadius({
      graph,
      seedIds: seeds,
      maxDepth,
    });
    const depths = new Map<string, number>();
    for (const s of seeds) depths.set(s, 0);
    for (const e of entries) depths.set(e.moduleId, e.depth);
    reviewStack.setBlastRadius(seeds[0]!, depths);
    if (moduleId) await session.focusOn(moduleId);
    return { entries, affectedGroupIds };
  }

  private navigateTo(p: Record<string, unknown>) {
    const path = String(p.path ?? "");
    if (!path) throw new Error("navigate_to requires a path.");
    const line = typeof p.line === "number" ? p.line : undefined;
    const symbol = asOptionalString(p.symbol);
    const openPreview = p.openPreview !== false;
    this.deps.reviewStack.requestNavigate({ path, line, symbol, openPreview });
    return { navigated: true, path, line, openPreview };
  }

  private getReviewState(includeResolved: boolean) {
    const { session, reviewNotes, reviewStack } = this.deps;
    const overlay = session.getDiffOverlay();
    const allDiffPaths = overlay
      ? [...new Set([...overlay.affectedModuleIds, ...overlay.deletedModuleIds])]
      : [];
    const reviewed = session.getDiffReviewedIds();
    const stack = reviewStack.getStack();
    const findings = (stack?.findings ?? []).filter((f) => includeResolved || f.status === "open");
    return {
      diffId: session.getActiveDiffId(),
      reviewedPaths: [...reviewed],
      unreviewedPaths: allDiffPaths.filter((p) => !reviewed.has(p)),
      reviewNotes: reviewNotes.getDocument()?.notes ?? [],
      findings,
      cohorts: stack?.cohorts ?? [],
    };
  }

  private setFilesReviewed(p: Record<string, unknown>) {
    const paths = Array.isArray(p.paths) ? p.paths.map(String) : [];
    const reviewed = Boolean(p.reviewed);
    this.deps.session.setDiffReviewed(paths, reviewed);
    return { reviewedPaths: [...this.deps.session.getDiffReviewedIds()] };
  }

  private async resolveFinding(p: Record<string, unknown>) {
    const id = String(p.findingId ?? "");
    const status = String(p.status ?? "resolved") as FindingStatus;
    const updated = await this.deps.reviewStack.resolveFinding(id, status);
    return { updated, findingId: id, status };
  }
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
