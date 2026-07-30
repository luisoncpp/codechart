// @Architecture(descriptionShort="Overlay bar shown while a diff visualization is active")
import { useState } from "react";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { ReviewChecklist } from "./ReviewChecklist";

interface DiffOverlayBarProps {
  store: GraphSessionStore;
  onStop: () => void;
}

export function DiffOverlayBar({ store, onStop }: DiffOverlayBarProps) {
  const [checklistOpen, setChecklistOpen] = useState(/*collapsed=*/false);
  const session = useGraphSession(store);
  const overlay = session.getDiffOverlay();
  const reviewedIds = session.getDiffReviewedIds();
  const reviewError = session.getDiffReviewError();
  const affected = [...(overlay?.affectedModuleIds ?? [])].sort((a, b) => a.localeCompare(b));
  const deleted = [...(overlay?.deletedModuleIds ?? [])].sort((a, b) => a.localeCompare(b));
  const total = affected.length + deleted.length;
  const done = [...affected, ...deleted].filter((id) => reviewedIds.has(id)).length;

  return (
    <div style={barStyle}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>
        Diff visualization active
      </span>
      <button
        type="button"
        aria-expanded={checklistOpen}
        title="Files reviewed in this diff"
        onClick={() => setChecklistOpen(/*open=*/!checklistOpen)}
        style={buttonStyle}
      >
        Reviewed {done}/{total} {checklistOpen ? "▴" : "▾"}
      </button>
      {reviewError && (
        <span style={{ fontSize: 11, color: "#b91c1c" }} title={reviewError}>
          review save failed
        </span>
      )}
      <button type="button" onClick={onStop} style={buttonStyle}>
        Stop visualizing diff
      </button>
      {checklistOpen && (
        <ReviewChecklist
          affectedIds={affected}
          deletedIds={deleted}
          reviewedIds={reviewedIds}
          onToggle={(moduleId: string) => store.toggleDiffReviewed(moduleId)}
          onUnmarkAll={() => store.unmarkAllDiffReviewed()}
        />
      )}
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: "absolute",
  top: 10,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "6px 12px",
  background: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: 8,
  zIndex: 5,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

const buttonStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #16a34a",
  background: "#fff",
  cursor: "pointer",
};
