// @Architecture(descriptionShort="Root React App component containing the layout and canvas")
import { useMemo, useState } from "react";
import { createTauriAnalysisClient } from "../../ipc/analysis-client";
import { createTauriGitClient } from "../../ipc/git-client";
import { createTauriShellClient } from "../../ipc/shell-client";
import { ElkLayoutEngine } from "../../domain/layout";
import { GraphSessionStore, useGraphSession } from "../../state/graph-session";
import { ProjectLoaderPanel } from "../../features/project_loader";
import { GraphCanvas } from "../../features/graph_canvas";
import { InspectionPanel } from "../../features/inspection_panel";

export function App() {
  const git = useMemo(/*build git client*/ () => createTauriGitClient(), []);
  const shell = useMemo(/*build shell client*/ () => createTauriShellClient(), []);
  const store = useMemo(
    /*build session store*/ () =>
      new GraphSessionStore(createTauriAnalysisClient(), git, new ElkLayoutEngine()),
    [git],
  );
  const session = useGraphSession(store);
  const ready = session.getPhase() === "ready";
  const [inspectorOpen, setInspectorOpen] = useState(/*defaultOpen=*/true);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ProjectLoaderPanel store={store} />
      {ready && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <GraphCanvas store={store} git={git} shell={shell} />
          </div>
          {inspectorOpen ? (
            <InspectionPanel store={store} onHide={() => setInspectorOpen(false)} />
          ) : (
            <button
              type="button"
              aria-label="Show inspector"
              title="Show inspector"
              onClick={() => setInspectorOpen(true)}
              style={showInspectorBtnStyle}
            >
              ◀
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const showInspectorBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 28,
  border: "none",
  borderLeft: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  fontSize: 11,
  cursor: "pointer",
};
