// @Architecture(descriptionShort="Side panel displaying detailed metadata of the selected node")
import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import { findModule, findGroup } from "../../../domain/graph";
import { ModuleInspection } from "./ModuleInspection";
import { GroupInspection } from "./GroupInspection";
import { PanelChrome } from "./PanelParts";

interface InspectionPanelProps {
  store: GraphSessionStore;
  onHide?: () => void;
}

export function InspectionPanel({ store, onHide }: InspectionPanelProps) {
  const session = useGraphSession(store);
  const graph = session.getGraph();
  const selectedId = session.getSelectedId();

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
