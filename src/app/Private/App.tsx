import { useMemo } from "react";
import { createTauriAnalysisClient } from "../../ipc/analysis-client";
import { GraphSessionStore } from "../../state/graph-session";
import { ProjectLoaderPanel } from "../../features/project_loader";

export function App() {
  const store = useMemo(
    () => new GraphSessionStore(createTauriAnalysisClient()),
    [],
  );

  return <ProjectLoaderPanel store={store} />;
}
