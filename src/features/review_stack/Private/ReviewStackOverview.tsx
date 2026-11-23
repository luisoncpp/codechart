// @Architecture(descriptionShort="Overview tab: MR summary, stats, merge blockers, and dependency-ordered cohorts")
import type { ReviewCohort, ReviewStackRecord } from "../../../ipc/review-stack-client";
import { cohortModuleIds } from "../../../state/review-stack";
import { StackMarkdown } from "./StackMarkdown";

interface ReviewStackOverviewProps {
  stack: ReviewStackRecord;
  reviewedIds: ReadonlySet<string>;
  activeCohortId: string | null;
  onSelectCohort: (cohortId: string | null) => void;
  onNavigateModule: (moduleId: string, line?: number) => void;
  onOpenExplanation: (cohortId: string) => void;
}

export function ReviewStackOverview({
  stack,
  reviewedIds,
  activeCohortId,
  onSelectCohort,
  onNavigateModule,
  onOpenExplanation,
}: ReviewStackOverviewProps) {
  const openFindings = stack.findings.filter((f) => f.status === "open");
  const criticalCount = openFindings.filter((f) => f.severity === "critical").length;
  const totalFiles = new Set(stack.cohorts.flatMap(cohortModuleIds)).size;

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
          <StackMarkdown source={stack.summary} className="rs-summary-text" />
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
            onOpenExplanation={() => onOpenExplanation(cohort.id)}
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
  onNavigateModule: (moduleId: string, line?: number) => void;
  onOpenExplanation: () => void;
}

function CohortCard(props: CohortCardProps) {
  const { index, cohort, reviewedIds, active, onToggle } = props;
  const files = cohortModuleIds(cohort);
  const doneCount = files.filter((id) => reviewedIds.has(id)).length;
  const num = String(index + 1).padStart(2, "0");

  return (
    <div className={`rs-cohort-card${active ? " rs-cohort-card--active" : ""}`}>
      <button type="button" className="rs-cohort-head" onClick={onToggle}>
        <span className="rs-cohort-num">{num}</span>
        <span className="rs-cohort-title">{cohort.title}</span>
        <span className="rs-cohort-progress">
          {doneCount}/{files.length}
          {files.length > 0 && doneCount === files.length ? " ✓" : ""}
        </span>
      </button>
      {cohort.rationale && <StackMarkdown source={cohort.rationale} className="rs-cohort-rationale" />}
      {cohort.explanation?.trim() && (
        <button type="button" className="rs-link-btn rs-cohort-explain" onClick={props.onOpenExplanation}>
          Read explanation ↗
        </button>
      )}
      <div className="rs-cohort-deps">
        {cohort.dependsOn.length === 0
          ? "Foundation layer"
          : `Depends on: ${cohort.dependsOn.join(", ")}`}
      </div>
      {active && <CohortFiles cohort={cohort} reviewedIds={reviewedIds} onNavigate={props.onNavigateModule} />}
    </div>
  );
}

interface CohortFilesProps {
  cohort: ReviewCohort;
  reviewedIds: ReadonlySet<string>;
  onNavigate: (moduleId: string, line?: number) => void;
}

/** Whole files first, then one entry per hunk (`path  L10–42`) that jumps to its first line. */
function CohortFiles({ cohort, reviewedIds, onNavigate }: CohortFilesProps) {
  const entries = [
    ...cohort.moduleIds.map((path) => ({ path, line: undefined, label: "" })),
    ...(cohort.hunks ?? []).map((h) => ({
      path: h.path,
      line: h.side === "before" ? undefined : h.startLine,
      label: `L${h.startLine}–${h.endLine}${h.side === "before" ? " (removed)" : ""}`,
    })),
  ];
  if (entries.length === 0) return null;
  return (
    <ul className="rs-cohort-files">
      {entries.map((entry, idx) => (
        <li key={`${entry.path}:${entry.label}:${idx}`}>
          <button type="button" className="rs-file-btn" onClick={() => onNavigate(entry.path, entry.line)}>
            <span>{reviewedIds.has(entry.path) ? "✓" : "○"}</span>
            <span className="rs-file-path">{entry.path}</span>
            {entry.label && <span className="rs-file-range">{entry.label}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
