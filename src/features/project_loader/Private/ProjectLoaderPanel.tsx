// @Architecture(descriptionShort="Visual folder selector panel for loading project analysis")
import { useState } from "react";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { architectureViolations, projectGraphSummary } from "../../../domain/graph";
import {
  createMockProjectConfigClient,
  type ProjectConfigClient,
} from "../../../ipc/project-config-client";
import { UnrealConfigModal } from "../../project_config";
import { FolderPicker, pickFolder as defaultPickFolder } from "./pick-folder";
import { FacadeBypassList } from "./FacadeBypassList";

const defaultConfigClient = createMockProjectConfigClient();

interface ProjectLoaderPanelProps {
  store: GraphSessionStore;
  configClient?: ProjectConfigClient;
  /** Injectable for tests; defaults to the native Tauri directory dialog. */
  pickFolder?: FolderPicker;
}

/** Top bar: pick a folder to analyze, reload it, and show session phase/summary. */
export function ProjectLoaderPanel({
  store,
  configClient = defaultConfigClient,
  pickFolder = defaultPickFolder,
}: ProjectLoaderPanelProps) {
  const session = useGraphSession(store);
  const [path, setPath] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const phase = session.getPhase();
  const graph = session.getGraph();
  const summary = graph ? projectGraphSummary(graph) : null;
  const bypasses = graph ? architectureViolations(graph) : [];

  const open = async () => {
    const picked = await pickFolder();
    if (!picked) return;
    setPath(picked);
    session.loadProject(picked);
  };

  return (
    <header style={barStyle}>
      <strong style={{ fontSize: 14 }}>Codechart</strong>
      <button type="button" onClick={open} disabled={phase === "loading"}>
        {phase === "loading" ? "Loading…" : "Open folder…"}
      </button>
      {path && (
        <button
          type="button"
          onClick={() => session.loadProject(path)}
          disabled={phase === "loading"}
        >
          Reload
        </button>
      )}
      {path && (
        <button
          type="button"
          onClick={() => setConfigOpen(true)}
          disabled={phase === "loading"}
        >
          Configure paths...
        </button>
      )}
      <StatusText
        phase={phase}
        path={path}
        summary={summary}
        error={session.getError()}
      />
      {phase === "ready" && <FacadeBypassList violations={bypasses} />}
      <UnrealConfigModal
        open={configOpen}
        root={path}
        client={configClient}
        onClose={() => setConfigOpen(false)}
        onSaved={() => path && session.loadProject(path)}
      />
    </header>
  );
}

interface StatusTextProps {
  phase: ReturnType<GraphSessionStore["getPhase"]>;
  path: string | null;
  summary: { moduleCount: number; edgeCount: number; diagnosticCount: number } | null;
  error: string | null;
}

/** The right-hand status message — varies by session phase. */
function StatusText({ phase, path, summary, error }: StatusTextProps) {
  if (phase === "idle")
    return <span style={hintStyle}>Open a project folder to map it.</span>;
  if (phase === "empty")
    return <span style={hintStyle}>No supported source files found in {path}.</span>;
  if (phase === "failed")
    return <span style={{ ...hintStyle, color: "#dc2626" }}>Error: {error}</span>;
  if (summary)
    return (
      <span style={hintStyle}>
        {summary.moduleCount} modules · {summary.edgeCount} edges ·{" "}
        {summary.diagnosticCount} diagnostics
      </span>
    );
  return null;
}

const barStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  borderBottom: "1px solid #e2e8f0",
  fontFamily: "sans-serif",
} as const;

const hintStyle = { fontSize: 12, color: "#475569" } as const;
