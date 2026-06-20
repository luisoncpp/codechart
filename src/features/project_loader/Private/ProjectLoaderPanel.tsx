import { useEffect } from "react";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { projectGraphSummary } from "../../../domain/graph";

interface ProjectLoaderPanelProps {
  store: GraphSessionStore;
}

/** Compact top bar: load control + session phase/summary. */
export function ProjectLoaderPanel({ store }: ProjectLoaderPanelProps) {
  const session = useGraphSession(store);
  const phase = session.getPhase();
  const graph = session.getGraph();
  const error = session.getError();
  const summary = graph ? projectGraphSummary(graph) : null;

  useEffect(() => {
    if (phase === "idle") session.loadProject("/sample");
  }, [phase, session]);

  return (
    <header style={barStyle}>
      <strong style={{ fontSize: 14 }}>Codechart</strong>
      <button
        type="button"
        onClick={() => session.loadProject("/sample")}
        disabled={phase === "loading"}
      >
        {phase === "loading" ? "Loading…" : "Reload sample"}
      </button>
      {summary && (
        <span style={{ fontSize: 12, color: "#475569" }}>
          {summary.moduleCount} modules · {summary.edgeCount} edges ·{" "}
          {summary.diagnosticCount} diagnostics
        </span>
      )}
      {phase === "empty" && (
        <span style={{ fontSize: 12, color: "#64748b" }}>No TS files found.</span>
      )}
      {phase === "failed" && (
        <span style={{ fontSize: 12, color: "#dc2626" }}>Error: {error}</span>
      )}
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
