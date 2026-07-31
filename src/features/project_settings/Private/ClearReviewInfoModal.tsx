// @Architecture(descriptionShort="Confirmation modal that wipes all review notes and diff review marks")
import { useEffect, useState } from "react";

interface ClearReviewInfoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ClearReviewInfoModal({
  open,
  onClose,
  onConfirm,
}: ClearReviewInfoModalProps) {
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  if (!open) return null;

  const confirm = async () => {
    setClearing(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <section
        role="dialog"
        aria-labelledby="clear-review-info-title"
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="clear-review-info-title" style={titleStyle}>
          Clear review info
        </h2>
        <p style={copyStyle}>
          Permanently deletes every Review Note and every reviewed-file
          checkmark (for all diffs) in this project.
        </p>
        {error && <div style={errorStyle}>{error}</div>}
        <div style={actionsStyle}>
          <button type="button" onClick={onClose} disabled={clearing}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear all"}
          </button>
        </div>
      </section>
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "#0f172a66",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panelStyle: React.CSSProperties = {
  width: "min(520px, 92vw)",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  background: "#ffffff",
  borderRadius: 10,
  boxShadow: "0 12px 40px #0f172a33",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#0f172a",
};

const copyStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#475569",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

const errorStyle: React.CSSProperties = {
  padding: 8,
  borderRadius: 6,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: 12,
};
