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
        onHide={onHide}
      />
    </InspectorLayoutProvider>
  );
}

function InspectionPanelBody({
  graph,
  selectedId,
  onHide,
}: {
  graph: ProjectGraph | null;
  selectedId: string | null;
  onHide?: () => void;
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
    return <ModuleInspection graph={graph} module={module} onHide={onHide} />;
  }

  const group = findGroup(graph, selectedId);
  if (group) {
    return <GroupInspection graph={graph} group={group} onHide={onHide} />;
  }

  return (
    <PanelChrome onHide={onHide}>
      <p style={{ color: "#64748b", margin: 0 }}>Unknown selection.</p>
    </PanelChrome>
  );
}
