// @Architecture(descriptionShort="Impact tab showing blast radius entries and newly introduced diagnostics")
import type { DiffImpactReport } from "../../../ipc/review-stack-client";

interface ImpactTabProps {
  impact: DiffImpactReport | null;
  blastActive: boolean;
  onShowBlastRadius: () => void;
  onClearBlastRadius: () => void;
  onNavigateModule: (moduleId: string) => void;
}

export function ImpactTab({
  impact,
  blastActive,
  onShowBlastRadius,
  onClearBlastRadius,
  onNavigateModule,
}: ImpactTabProps) {
  if (!impact) {
    return (
      <div className="rs-empty">
        Run <code>analyze_diff_impact</code> from your MCP agent or click Refresh Impact to compute
        blast radius and architecture delta.
      </div>
    );
  }

  return (
    <div className="rs-section-stack">
      <div className="rs-card">
        <div className="rs-cohorts-header">
          <span className="rs-card-label">
            Blast Radius ({impact.blastRadius.length} downstream)
          </span>
          {blastActive ? (
            <button type="button" className="rs-link-btn" onClick={onClearBlastRadius}>
              Hide on canvas
            </button>
          ) : (
            <button type="button" className="rs-link-btn" onClick={onShowBlastRadius}>
              Highlight on canvas
            </button>
          )}
        </div>
        {impact.affectedGroupIds.length > 0 && (
          <div className="rs-cohort-deps">
            Affected groups: {impact.affectedGroupIds.join(", ")}
          </div>
        )}
        <ul className="rs-cohort-files">
          {impact.blastRadius.slice(0, 20).map((entry) => (
            <li key={entry.moduleId}>
              <button
                type="button"
                className="rs-file-btn"
                onClick={() => onNavigateModule(entry.moduleId)}
              >
                <span className="rs-depth-chip">R+{entry.depth}</span>
                <span className="rs-file-path">{entry.moduleId}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rs-card">
        <div className="rs-card-label">
          New Architecture Diagnostics ({impact.newDiagnostics.length})
        </div>
        {impact.newDiagnosticsAvailable === false ? (
          <div className="rs-cohort-deps">Not computed: pasted diffs have no before-graph to compare.</div>
        ) : impact.newDiagnostics.length === 0 ? (
          <div className="rs-cohort-deps">No newly introduced cycles or layering violations.</div>
        ) : (
          impact.newDiagnostics.map((d) => (
            <div key={d.id} className="rs-blocker-item">
              <div className="rs-blocker-title">{d.kind}</div>
              <div className="rs-blocker-desc">{d.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
