// @Architecture(descriptionShort="Side panel displaying detailed metadata of the selected node")
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { findModule, findGroup, type ProjectGraph } from "../../../domain/graph";
import { ModuleInspection } from "./ModuleInspection";
import { GroupInspection } from "./GroupInspection";
import { InspectorLayoutProvider } from "./InspectorLayoutContext";
import { PanelChrome } from "./PanelParts";

interface InspectionPanelProps {
  store: GraphSessionStore;
  onHide?: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export function InspectionPanel({
  store,
  onHide,
  width,
  onWidthChange,
}: InspectionPanelProps) {
  const session = useGraphSession(store);
  const graph = session.getGraph();
  const selectedId = session.getSelectedId();

  return (
    <InspectorLayoutProvider width={width} setWidth={onWidthChange}>
      <InspectionPanelBody
        graph={graph}
        selectedId={selectedId}
        hideTests={session.getHideTests()}
        onHide={onHide}
        onNavigateToModule={(moduleId) => store.focusOn(moduleId)}
      />
    </InspectorLayoutProvider>
  );
}

function InspectionPanelBody({
  graph,
  selectedId,
  hideTests,
  onHide,
  onNavigateToModule,
}: {
  graph: ProjectGraph | null;
  selectedId: string | null;
  hideTests: boolean;
  onHide?: () => void;
  onNavigateToModule: (moduleId: string) => void;
}) {
  if (!graph || !selectedId) {
    return (
      <PanelChrome onHide={onHide}>
        <p style={{ color: "#64748b", margin: 0 }}>
          Select a module or group to inspect it.
        </p>
      </PanelChrome>
    );
  }

  const module = findModule(graph, selectedId);
  if (module) {
    return (
      <ModuleInspection
        graph={graph}
        module={module}
        hideTests={hideTests}
        onHide={onHide}
        onNavigateToModule={onNavigateToModule}
      />
    );
  }

  const group = findGroup(graph, selectedId);
  if (group) {
    return (
      <GroupInspection
        graph={graph}
        group={group}
        onHide={onHide}
        onNavigateToModule={onNavigateToModule}
      />
    );
  }

  return (
    <PanelChrome onHide={onHide}>
      <p style={{ color: "#64748b", margin: 0 }}>Unknown selection.</p>
    </PanelChrome>
  );
}
