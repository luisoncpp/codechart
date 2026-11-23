// @Architecture(descriptionShort="Findings tab with severity filter and jump-to-code controls")
import type {
  FindingSeverity,
  FindingStatus,
  ReviewFinding,
} from "../../../ipc/review-stack-client";

const SEVERITIES: Array<FindingSeverity | "all"> = ["all", "critical", "major", "minor", "trivial"];

interface FindingsListProps {
  findings: readonly ReviewFinding[];
  filter: FindingSeverity | "all";
  onFilterChange: (next: FindingSeverity | "all") => void;
  onNavigate: (finding: ReviewFinding) => void;
  onStatusChange: (findingId: string, status: FindingStatus) => void;
}

export function FindingsList({
  findings,
  filter,
  onFilterChange,
  onNavigate,
  onStatusChange,
}: FindingsListProps) {
  const visible = findings.filter((f) => filter === "all" || f.severity === filter);

  return (
    <div className="rs-section-stack">
      <div className="rs-filter-row" role="group" aria-label="Severity filter">
        {SEVERITIES.map((sev) => (
          <button
            key={sev}
            type="button"
            className={`rs-pill${filter === sev ? " rs-pill--active" : ""}`}
            onClick={() => onFilterChange(sev)}
          >
            {sev}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rs-empty">No findings match this filter.</div>
      ) : (
        visible.map((finding) => (
          <div
            key={finding.id}
            className={`rs-finding-card rs-sev--${finding.severity}${finding.status !== "open" ? " rs-finding--done" : ""}`}
          >
            <div className="rs-finding-head">
              <span className={`rs-sev-badge rs-sev-badge--${finding.severity}`}>
                {finding.severity}
              </span>
              {finding.blocker && <span className="rs-blocker-tag">blocker</span>}
              <span className="rs-finding-title">{finding.title}</span>
            </div>
            <p className="rs-finding-body">{finding.body}</p>
            <div className="rs-finding-actions">
              <button type="button" className="rs-link-btn" onClick={() => onNavigate(finding)}>
                {finding.path}:{finding.startLine}
              </button>
              <button
                type="button"
                className="rs-action-btn"
                onClick={() =>
                  onStatusChange(finding.id, finding.status === "open" ? "resolved" : "open")
                }
              >
                {finding.status === "open" ? "✓ Resolve" : "Reopen"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
