// @Architecture(descriptionShort="Inline severity-badged finding cards rendered below matching diff code rows")
import type { ReviewFinding } from "../../../ipc/review-stack-client";
import { useReviewStackStore } from "./ReviewStackContext";

interface InlineFindingsProps {
  findings: readonly ReviewFinding[];
  zoom: number;
}

export function InlineFindings({ findings, zoom }: InlineFindingsProps) {
  const store = useReviewStackStore();
  if (findings.length === 0) return null;
  const scale = zoom > 0 ? 1 / zoom : 1;

  return (
    <div
      className="rs-inline-list"
      style={{ ["--rs-scale" as string]: String(scale) }}
    >
      {findings.map((finding) => (
        <div
          key={finding.id}
          className={`rs-inline-card rs-sev--${finding.severity}${finding.status !== "open" ? " rs-finding--done" : ""}`}
        >
          <div className="rs-inline-head">
            <span className={`rs-sev-badge rs-sev-badge--${finding.severity}`}>
              {finding.severity}
            </span>
            <strong className="rs-inline-title">{finding.title}</strong>
            {store && (
              <button
                type="button"
                className="rs-action-btn"
                onClick={() =>
                  void store.resolveFinding(
                    finding.id,
                    finding.status === "open" ? "resolved" : "open",
                  )
                }
              >
                {finding.status === "open" ? "✓ Resolve" : "Reopen"}
              </button>
            )}
          </div>
          <div className="rs-inline-body">{finding.body}</div>
          {finding.suggestedFix && (
            <pre className="rs-inline-fix">{finding.suggestedFix}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
