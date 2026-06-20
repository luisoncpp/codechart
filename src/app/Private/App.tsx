import { useMemo } from "react";
import { createMockAnalysisClient } from "../../ipc/analysis-client";
import { ElkLayoutEngine } from "../../domain/layout";
import { GraphSessionStore, useGraphSession } from "../../state/graph-session";
import { ProjectLoaderPanel } from "../../features/project_loader";
import { GraphCanvas } from "../../features/graph_canvas";
import { InspectionPanel } from "../../features/inspection_panel";

export function App() {
  const store = useMemo(
    /*build session store*/ () =>
      new GraphSessionStore(createMockAnalysisClient(), new ElkLayoutEngine()),
    [],
  );
  const session = useGraphSession(store);
  const ready = session.getPhase() === "ready";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ProjectLoaderPanel store={store} />
      {ready && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <GraphCanvas store={store} />
          </div>
          <InspectionPanel store={store} />
        </div>
      )}
    </div>
  );
}
