// @Architecture(descriptionShort="Collapsible left Review Stack drawer integrating Overview, Findings, and Impact")
import "./review-stack.css";
import { ReviewStackStore, useReviewStack } from "../../../state/review-stack";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { ReviewStackOverview } from "./ReviewStackOverview";
import { FindingsList } from "./FindingsList";
import { ImpactTab } from "./ImpactTab";

interface ReviewStackDrawerProps {
  stackStore: ReviewStackStore;
  sessionStore: GraphSessionStore;
  onRefreshImpact?: () => void;
}

export function ReviewStackDrawer({
  stackStore,
  sessionStore,
  onRefreshImpact,
}: ReviewStackDrawerProps) {
  const stackState = useReviewStack(stackStore);
  const session = useGraphSession(sessionStore);
  const diffOverlay = session.getDiffOverlay();
  if (!diffOverlay) return null;

  const stack = stackState.getStack();
  const impact = stackState.getImpact();
  const open = stackState.getDrawerOpen();
  const tab = stackState.getActiveTab();
  const reviewedIds = session.getDiffReviewedIds();

  if (!open) {
    return (
      <button
        type="button"
        className="rs-collapsed-rail"
        aria-label="Show Review Stack"
        title="Show Review Stack"
        onClick={() => stackStore.setDrawerOpen(/*open=*/true)}
      >
        <span>▶</span>
        <span className="rs-rail-label">Stack</span>
      </button>
    );
  }

  const openFindingCount = stack?.findings.filter((f) => f.status === "open").length ?? 0;

  return (
    <aside className="rs-drawer" aria-label="Review Stack">
      <div className="rs-drawer-header">
        <div className="rs-drawer-title">{stack?.title ?? "Review Stack"}</div>
        <button
          type="button"
          className="rs-icon-btn"
          aria-label="Hide Review Stack"
          onClick={() => stackStore.setDrawerOpen(/*open=*/false)}
        >
          ◀
        </button>
      </div>

      <div className="rs-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          className={`rs-tab${tab === "overview" ? " rs-tab--active" : ""}`}
          onClick={() => stackStore.setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "findings"}
          className={`rs-tab${tab === "findings" ? " rs-tab--active" : ""}`}
          onClick={() => stackStore.setActiveTab("findings")}
        >
          Findings ({openFindingCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "impact"}
          className={`rs-tab${tab === "impact" ? " rs-tab--active" : ""}`}
          onClick={() => {
            stackStore.setActiveTab("impact");
            if (!impact && onRefreshImpact) onRefreshImpact();
          }}
        >
          Impact
        </button>
      </div>

      <div className="rs-drawer-body">
        {tab === "overview" && (
          stack ? (
            <ReviewStackOverview
              stack={stack}
              reviewedIds={reviewedIds}
              activeCohortId={stackState.getActiveCohortId()}
              onSelectCohort={(id) => stackStore.focusCohort(id)}
              onNavigateModule={(moduleId, line) =>
                stackStore.requestNavigate({ path: moduleId, line, openPreview: true })
              }
            />
          ) : (
            <div className="rs-empty">
              No Review Stack loaded for this diff yet. Ask your coding agent over{" "}
              <code>codechart-mcp</code> to analyze this MR and populate a Change Stack.
            </div>
          )
        )}

        {tab === "findings" && (
          <FindingsList
            findings={stack?.findings ?? []}
            filter={stackState.getSeverityFilter()}
            onFilterChange={(f) => stackStore.setSeverityFilter(f)}
            onNavigate={(f) =>
              stackStore.requestNavigate({ path: f.path, line: f.startLine, openPreview: true })
            }
            onStatusChange={(id, status) => void stackStore.resolveFinding(id, status)}
          />
        )}

        {tab === "impact" && (
          <ImpactTab
            impact={impact}
            blastActive={Boolean(stackState.getBlastRadius())}
            onShowBlastRadius={() => {
              if (!impact) return;
              const depths = new Map<string, number>();
              for (const id of impact.changedModuleIds) depths.set(id, 0);
              for (const entry of impact.blastRadius) depths.set(entry.moduleId, entry.depth);
              stackStore.setBlastRadius(impact.changedModuleIds[0] ?? "", depths);
            }}
            onClearBlastRadius={() => stackStore.clearBlastRadius()}
            onNavigateModule={(moduleId) =>
              stackStore.requestNavigate({ path: moduleId, openPreview: true })
            }
          />
        )}
      </div>
    </aside>
  );
}
