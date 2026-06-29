// @Architecture(descriptionShort="Modal for entering a diff via paste or git commits")
import { useEffect, useState } from "react";
import type { GitClient, GitCommit } from "../../../ipc/git-client";
import type { GraphSessionStore } from "../../../state/graph-session";
import { CommitPanel } from "./CommitPanel";
import { ModePicker, PastePanel, type DiffMode } from "./DiffModalParts";

interface DiffModalProps {
  store: GraphSessionStore;
  git: GitClient;
  open: boolean;
  onClose: () => void;
}

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
        void git.listCommits(root, /*limit=*/ 100).then(setCommits);
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
  width: "min(640px, 92vw)",
  background: "#fff",
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 12px 40px #0f172a33",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 16,
};

const errorStyle: React.CSSProperties = {
  color: "#dc2626",
  fontSize: 12,
  margin: "8px 0 0",
};
