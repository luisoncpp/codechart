// @Architecture(descriptionShort="Top toolbar: project chip, load controls, menu slot, and status")
import type { ReactNode } from "react";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { architectureViolations, projectGraphSummary } from "../../../domain/graph";
import { FolderPicker, pickFolder as defaultPickFolder } from "./pick-folder";
import { FacadeBypassList } from "./FacadeBypassList";
import { StatusText } from "./StatusText";
import { projectBasename } from "./project-basename";

interface ProjectLoaderPanelProps {
  store: GraphSessionStore;
  /** Injectable for tests; defaults to the native Tauri directory dialog. */
  pickFolder?: FolderPicker;
  /** Slot for toolbar dropdown menus (composed by the app shell). */
  menus?: ReactNode;
}

/** Top bar: pick a folder to analyze, reload it, and show session phase/summary. */
export function ProjectLoaderPanel({
  store,
  pickFolder = defaultPickFolder,
  menus,
}: ProjectLoaderPanelProps) {
  const session = useGraphSession(store);
  const path = session.getProjectRoot();
  const phase = session.getPhase();
  const graph = session.getGraph();
  const summary = graph ? projectGraphSummary(graph) : null;
  const bypasses = graph ? architectureViolations(graph) : [];

  const open = async () => {
    const picked = await pickFolder();
    if (!picked) return;
    session.loadProject(picked);
  };

  return (
    <header style={barStyle}>
      <button type="button" onClick={open} disabled={phase === "loading"}>
        {phase === "loading" ? "Loading…" : "Open folder…"}
      </button>
      {path && (
        <span style={projectChipStyle} title={path}>
          {projectBasename(path)}
        </span>
      )}
      {path && (
        <button
          type="button"
          aria-label="Reload"
          title="Reload"
          onClick={() => session.loadProject(path)}
          disabled={phase === "loading"}
          style={iconButtonStyle}
        >
          ↻
        </button>
      )}
      {menus}
      <span style={{ marginLeft: "auto" }} />
      <StatusText
        phase={phase}
        path={path}
        summary={summary}
        error={session.getError()}
      />
      {phase === "ready" && <FacadeBypassList violations={bypasses} />}
    </header>
  );
}

const barStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  borderBottom: "1px solid #e2e8f0",
  fontFamily: "sans-serif",
} as const;

const projectChipStyle: React.CSSProperties = {
  padding: "3px 8px",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  cursor: "default",
};

const iconButtonStyle: React.CSSProperties = {
  padding: "3px 8px",
  fontSize: 13,
  lineHeight: 1,
  color: "#475569",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  cursor: "pointer",
};
