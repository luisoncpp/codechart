// @Architecture(descriptionShort="Overview tab: MR summary, stats, merge blockers, and dependency-ordered cohorts")
import type { ReviewCohort, ReviewStackRecord } from "../../../ipc/review-stack-client";

interface ReviewStackOverviewProps {
  stack: ReviewStackRecord;
  reviewedIds: ReadonlySet<string>;
  activeCohortId: string | null;
  onSelectCohort: (cohortId: string | null) => void;
  onNavigateModule: (moduleId: string, line?: number) => void;
}

export function ReviewStackOverview({
  stack,
  reviewedIds,
  activeCohortId,
  onSelectCohort,
  onNavigateModule,
}: ReviewStackOverviewProps) {
  const openFindings = stack.findings.filter((f) => f.status === "open");
  const criticalCount = openFindings.filter((f) => f.severity === "critical").length;
  const totalFiles = new Set(stack.cohorts.flatMap((c) => c.moduleIds)).size;

  return (
    <div className="rs-section-stack">
      <div className="rs-stats-grid">
        <StatCard label="Layers" value={String(stack.cohorts.length)} />
        <StatCard label="Files" value={String(totalFiles)} />
        <StatCard
          label="Findings"
          value={String(openFindings.length)}
          accent={criticalCount > 0 ? `${criticalCount} critical` : undefined}
        />
      </div>

      {stack.summary && (
        <section className="rs-card">
          <div className="rs-card-label">Summary</div>
          <p className="rs-summary-text">{stack.summary}</p>
        </section>
      )}

      {stack.blockers.length > 0 && (
        <section className="rs-card rs-card--blocker">
          <div className="rs-card-label">
            {stack.blockers.length} merge blocker{stack.blockers.length === 1 ? "" : "s"}
          </div>
          {stack.blockers.map((b) => (
            <div key={b.id} className="rs-blocker-item">
              <div className="rs-blocker-title">{b.title}</div>
              {b.description && <div className="rs-blocker-desc">{b.description}</div>}
              {b.moduleId && (
                <button
                  type="button"
                  className="rs-link-btn"
                  onClick={() => onNavigateModule(b.moduleId!)}
                >
                  Open {b.moduleId} →
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="rs-cohorts">
        <div className="rs-cohorts-header">
          <span className="rs-card-label">Change Stack Layers</span>
          {activeCohortId && (
            <button type="button" className="rs-link-btn" onClick={() => onSelectCohort(null)}>
              Clear spotlight
            </button>
          )}
        </div>
        {stack.cohorts.map((cohort, idx) => (
          <CohortCard
            key={cohort.id}
            index={idx}
            cohort={cohort}
            reviewedIds={reviewedIds}
            active={cohort.id === activeCohortId}
            onToggle={() => onSelectCohort(cohort.id === activeCohortId ? null : cohort.id)}
            onNavigateModule={onNavigateModule}
          />
        ))}
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rs-stat-card">
      <div className="rs-stat-label">{label}</div>
      <div className="rs-stat-value">{value}</div>
      {accent && <div className="rs-stat-accent">{accent}</div>}
    </div>
  );
}

interface CohortCardProps {
  index: number;
  cohort: ReviewCohort;
  reviewedIds: ReadonlySet<string>;
  active: boolean;
  onToggle: () => void;
  onNavigateModule: (moduleId: string) => void;
}

function CohortCard({ index, cohort, reviewedIds, active, onToggle, onNavigateModule }: CohortCardProps) {
  const doneCount = cohort.moduleIds.filter((id) => reviewedIds.has(id)).length;
  const total = cohort.moduleIds.length;
  const num = String(index + 1).padStart(2, "0");

  return (
    <div className={`rs-cohort-card${active ? " rs-cohort-card--active" : ""}`}>
      <button type="button" className="rs-cohort-head" onClick={onToggle}>
        <span className="rs-cohort-num">{num}</span>
        <span className="rs-cohort-title">{cohort.title}</span>
        <span className="rs-cohort-progress">
          {doneCount}/{total}
          {total > 0 && doneCount === total ? " ✓" : ""}
        </span>
      </button>
      {cohort.rationale && <div className="rs-cohort-rationale">{cohort.rationale}</div>}
      <div className="rs-cohort-deps">
        {cohort.dependsOn.length === 0
          ? "Foundation layer"
          : `Depends on: ${cohort.dependsOn.join(", ")}`}
      </div>
      {active && cohort.moduleIds.length > 0 && (
        <ul className="rs-cohort-files">
          {cohort.moduleIds.map((id) => (
            <li key={id}>
              <button type="button" className="rs-file-btn" onClick={() => onNavigateModule(id)}>
                <span>{reviewedIds.has(id) ? "✓" : "○"}</span>
                <span className="rs-file-path">{id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
