// @Architecture(descriptionShort="Root React App component containing the layout and canvas")
import { useMemo, useState } from "react";
import { createTauriAnalysisClient } from "../../ipc/analysis-client";
import { createTauriProjectConfigClient } from "../../ipc/project-config-client";
import { createTauriGitClient } from "../../ipc/git-client";
import { createTauriShellClient } from "../../ipc/shell-client";
import { ElkLayoutEngine } from "../../domain/layout";
import { GraphSessionStore, useGraphSession } from "../../state/graph-session";
import { ProjectLoaderPanel } from "../../features/project_loader";
import { GraphCanvas } from "../../features/graph_canvas";
import {
  DEFAULT_INSPECTOR_WIDTH,
  InspectionPanel,
} from "../../features/inspection_panel";

export function App() {
  const git = useMemo(/*build git client*/ () => createTauriGitClient(), []);
  const config = useMemo(
    /*build config client*/ () => createTauriProjectConfigClient(),
    [],
  );
  const shell = useMemo(/*build shell client*/ () => createTauriShellClient(), []);
  const store = useMemo(
    /*build session store*/ () =>
      new GraphSessionStore(createTauriAnalysisClient(), git, new ElkLayoutEngine()),
    [git],
  );
  const session = useGraphSession(store);
  const ready = session.getPhase() === "ready";
  const [inspectorOpen, setInspectorOpen] = useState(/*defaultOpen=*/true);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);

  return (
    <div style={appShellStyle}>
      <ProjectLoaderPanel store={store} configClient={config} />
      {ready && (
        <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <GraphCanvas store={store} git={git} shell={shell} />
          </div>
          {inspectorOpen ? (
            <InspectionPanel
              store={store}
              width={inspectorWidth}
              onWidthChange={setInspectorWidth}
              onHide={() => setInspectorOpen(false)}
            />
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

const appShellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
};

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
