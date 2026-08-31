// @Architecture(descriptionShort="Shared dialog chrome for the project config modals")
// Backdrop, titled dialog, loading placeholder, error banner, and Cancel/Save
// actions. Both config modals differ only in their title, copy, and body fields.

import type { ReactNode } from "react";
import {
  actionsStyle,
  backdropStyle,
  copyStyle,
  errorStyle,
  panelStyle,
  titleStyle,
} from "./config-modal-styles";

interface ConfigModalShellProps {
  titleId: string;
  title: string;
  description: ReactNode;
  state: { loading: boolean; saving: boolean; error: string | null };
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}

export function ConfigModalShell({
  titleId,
  title,
  description,
  state,
  canSave,
  onClose,
  onSave,
  children,
}: ConfigModalShellProps) {
  const { loading, saving, error } = state;
  return (
    <div style={backdropStyle} onClick={onClose}>
      <section
        role="dialog"
        aria-labelledby={titleId}
        style={panelStyle}
        onClick={/*keep clicks inside from closing*/ (e) => e.stopPropagation()}
      >
        <h2 id={titleId} style={titleStyle}>
          {title}
        </h2>
        <p style={copyStyle}>{description}</p>
        {loading ? <div style={copyStyle}>Loading config...</div> : children}
        {error && <div style={errorStyle}>{error}</div>}
        <div style={actionsStyle}>
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading || saving || !canSave}
          >
            {saving ? "Saving..." : "Save and reload"}
          </button>
        </div>
      </section>
    </div>
  );
}
