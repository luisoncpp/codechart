// @Architecture(descriptionShort="Modal for the project-local editor executable")
import { useEffect, useState } from "react";
import {
  DEFAULT_EDITOR,
  type ProjectConfigClient,
} from "../../../ipc/project-config-client";

interface EditorConfigModalProps {
  open: boolean;
  root: string;
  editor: string;
  client: ProjectConfigClient;
  onClose: () => void;
  onSaved: (editor: string) => void;
}

export function EditorConfigModal({
  open,
  root,
  editor,
  client,
  onClose,
  onSaved,
}: EditorConfigModalProps) {
  const [draft, setDraft] = useState(editor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(editor);
    setError(null);
  }, [editor, open]);

  if (!open) return null;

  const save = async () => {
    const nextEditor = draft.trim();
    if (!nextEditor) return;
    setSaving(true);
    setError(null);
    try {
      const config = await client.readProjectConfig(root);
      await client.writeProjectConfig(root, { ...config, editor: nextEditor });
      onSaved(nextEditor);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <section
        role="dialog"
        aria-labelledby="editor-config-title"
        style={panelStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="editor-config-title" style={titleStyle}>Editor</h2>
        <p style={copyStyle}>
          Application name or full executable path used by Open in editor.
        </p>
        <label style={labelStyle} htmlFor="editor-executable">
          Editor executable
        </label>
        <input
          id="editor-executable"
          value={draft}
          placeholder={DEFAULT_EDITOR}
          autoFocus
          style={inputStyle}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
          }}
        />
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_EDITOR)}
          style={defaultButtonStyle}
        >
          Use VS Code default
        </button>
        {error && <div style={errorStyle}>{error}</div>}
        <div style={actionsStyle}>
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !draft.trim()}
          >
            {saving ? "Saving..." : "Save"}
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

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
};

const defaultButtonStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  border: "none",
  padding: 0,
  background: "transparent",
  color: "#2563eb",
  fontSize: 12,
  cursor: "pointer",
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
