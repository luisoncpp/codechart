import { useEffect } from "react";
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { projectGraphSummary } from "../../../domain/graph";

interface ProjectLoaderPanelProps {
  store: GraphSessionStore;
}

export function ProjectLoaderPanel({ store }: ProjectLoaderPanelProps) {
  const session = useGraphSession(store);
  const phase = session.getPhase();
  const graph = session.getGraph();
  const error = session.getError();
  const summary = graph ? projectGraphSummary(graph) : null;

  useEffect(() => {
    if (phase === "idle") {
      session.loadProject("/sample");
    }
  }, [phase, session]);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Codechart</h1>
      <p>Open a TypeScript project to visualize its architecture.</p>

      <button
        type="button"
        onClick={() => session.loadProject("/sample")}
        disabled={phase === "loading"}
      >
        {phase === "loading" ? "Loading…" : "Load sample project"}
      </button>

      {phase === "failed" && <p style={{ color: "red" }}>Error: {error}</p>}

      {summary && (
        <div style={{ marginTop: 16 }}>
          <p>
            {summary.moduleCount} modules, {summary.edgeCount} edges,{" "}
            {summary.diagnosticCount} diagnostics
          </p>
        </div>
      )}
    </div>
  );
}
