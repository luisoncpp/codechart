// @Architecture(descriptionShort="Modal for choosing the git-metrics lookback window")
import { useState, type FormEvent } from "react";

interface MetricsWindowModalProps {
  days: number;
  onApply: (days: number) => Promise<void>;
  onClose: () => void;
}

export function MetricsWindowModal({
  days,
  onApply,
  onClose,
}: MetricsWindowModalProps) {
  const [draft, setDraft] = useState(String(days));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <MetricsWindowForm
      draft={draft}
      busy={busy}
      error={error}
      onDraftChange={setDraft}
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        void applyWindow({ draft, onApply, onClose, setBusy, setError });
      }}
    />
  );
}

interface ApplyWindowOptions {
  draft: string;
  onApply: (days: number) => Promise<void>;
  onClose: () => void;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
}

async function applyWindow(options: ApplyWindowOptions) {
  const nextDays = Number(options.draft);
  if (!Number.isInteger(nextDays) || nextDays < 1) {
    options.setError("Enter a whole number of at least 1 day.");
    return;
  }
  options.setBusy(true);
  options.setError(null);
  try {
    await options.onApply(nextDays);
    options.onClose();
  } catch (cause) {
    options.setError(cause instanceof Error ? cause.message : String(cause));
  } finally {
    options.setBusy(false);
  }
}

interface MetricsWindowFormProps {
  draft: string;
  busy: boolean;
  error: string | null;
  onDraftChange: (draft: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}

function MetricsWindowForm(props: MetricsWindowFormProps) {
  return (
    <div style={backdropStyle} onClick={props.onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="metrics-window-title"
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
        onSubmit={props.onSubmit}
      >
        <h2 id="metrics-window-title" style={titleStyle}>Activity timeframe</h2>
        <p style={copyStyle}>Include Git activity from the last:</p>
        <WindowField draft={props.draft} onChange={props.onDraftChange} />
        {props.error && <p role="alert" style={errorStyle}>{props.error}</p>}
        <ModalActions busy={props.busy} onClose={props.onClose} />
      </form>
    </div>
  );
}

function WindowField({ draft, onChange }: { draft: string; onChange: (draft: string) => void }) {
  return (
    <label style={fieldStyle}>
      <input
        aria-label="Number of days"
        type="number"
        min={1}
        step={1}
        value={draft}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
      <span>days</span>
    </label>
  );
}

function ModalActions({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  return (
    <div style={actionsStyle}>
      <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
      <button type="submit" disabled={busy}>{busy ? "Applying…" : "Apply"}</button>
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 1000, background: "#0f172a66",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const panelStyle: React.CSSProperties = {
  width: "min(360px, 92vw)", padding: 20, borderRadius: 10,
  background: "#fff", boxShadow: "0 12px 40px #0f172a33",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 18, color: "#0f172a" };
const copyStyle: React.CSSProperties = { margin: "12px 0 8px", fontSize: 13, color: "#475569" };
const fieldStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13 };
const inputStyle: React.CSSProperties = {
  width: 100, padding: "7px 9px", border: "1px solid #cbd5e1",
  borderRadius: 6, font: "inherit",
};
const errorStyle: React.CSSProperties = { margin: "8px 0 0", color: "#dc2626", fontSize: 12 };
const actionsStyle: React.CSSProperties = {
  display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18,
};
