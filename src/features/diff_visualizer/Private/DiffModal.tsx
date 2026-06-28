// @Architecture(descriptionShort="Modal for entering a diff via paste or git commits")
import { useEffect, useState } from "react";
import type { GitClient, GitCommit } from "../../../ipc/git-client";
import type { GraphSessionStore } from "../../../state/graph-session";

interface DiffModalProps {
  store: GraphSessionStore;
  git: GitClient;
  open: boolean;
  onClose: () => void;
}

type DiffMode = "paste" | "commits";

export function DiffModal({ store, git, open, onClose }: DiffModalProps) {
  const [mode, setMode] = useState<DiffMode>("paste");
  const [pasteText, setPasteText] = useState("");
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [gitAvailable, setGitAvailable] = useState(false);
  const [baseRef, setBaseRef] = useState("");
  const [headRef, setHeadRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const root = store.getProjectRoot();
    if (!root) {
      setGitAvailable(false);
      return;
    }
    void git.isGitRepo(root).then((ok: boolean) => {
      setGitAvailable(ok);
      if (ok) {
        void git.listCommits(root, /*limit=*/ 30).then(setCommits);
      }
    });
  }, [open, store, git]);

  if (!open) return null;

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "paste") {
        if (!pasteText.trim()) {
          setError("Paste a unified diff first.");
          return;
        }
        store.applyDiffFromPaste(pasteText);
      } else {
        if (!baseRef || !headRef) {
          setError("Pick a base and head commit.");
          return;
        }
        await store.applyDiffFromCommits(baseRef, headRef);
        if (store.getDiffError()) {
          setError(store.getDiffError());
          return;
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="diff-modal-title"
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="diff-modal-title" style={{ margin: "0 0 12px", fontSize: 16 }}>
          Visualize diff
        </h2>
        <ModePicker mode={mode} gitAvailable={gitAvailable} onChange={setMode} />
        {mode === "paste" ? (
          <PastePanel text={pasteText} onChange={setPasteText} />
        ) : (
          <CommitPanel
            commits={commits}
            baseRef={baseRef}
            headRef={headRef}
            onBaseChange={setBaseRef}
            onHeadChange={setHeadRef}
          />
        )}
        {error && <p style={errorStyle}>{error}</p>}
        <div style={actionsStyle}>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" onClick={() => void apply()} disabled={busy}>
            {busy ? "Applying…" : "Visualize"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModePicker({
  mode,
  gitAvailable,
  onChange,
}: {
  mode: DiffMode;
  gitAvailable: boolean;
  onChange: (mode: DiffMode) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      <label style={radioStyle}>
        <input
          type="radio"
          checked={mode === "paste"}
          onChange={() => onChange("paste")}
        />
        Paste diff
      </label>
      <label style={{ ...radioStyle, opacity: gitAvailable ? 1 : 0.5 }}>
        <input
          type="radio"
          checked={mode === "commits"}
          disabled={!gitAvailable}
          onChange={() => onChange("commits")}
        />
        Git commits
      </label>
    </div>
  );
}

function PastePanel({
  text,
  onChange,
}: {
  text: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Paste a unified diff (git diff output)…"
      style={textareaStyle}
      rows={12}
    />
  );
}

function CommitPanel({
  commits,
  baseRef,
  headRef,
  onBaseChange,
  onHeadChange,
}: {
  commits: GitCommit[];
  baseRef: string;
  headRef: string;
  onBaseChange: (value: string) => void;
  onHeadChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <CommitSelect label="Base (before)" value={baseRef} commits={commits} onChange={onBaseChange} />
      <CommitSelect label="Head (after)" value={headRef} commits={commits} onChange={onHeadChange} />
    </div>
  );
}

function CommitSelect({
  label,
  value,
  commits,
  onChange,
}: {
  label: string;
  value: string;
  commits: GitCommit[];
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <option value="">Select commit…</option>
        {commits.map((c) => (
          <option key={c.hash} value={c.hash}>
            {c.hash.slice(0, 7)} — {c.message}
          </option>
        ))}
      </select>
    </label>
  );
}

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#0f172a66",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const panelStyle: React.CSSProperties = {
  width: "min(560px, 92vw)",
  background: "#fff",
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 12px 40px #0f172a33",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  padding: 8,
};

const selectStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 16,
};

const radioStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: 12,
  margin: "8px 0 0",
};
