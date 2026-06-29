// @Architecture(descriptionShort="Inspection details for a selected group node")
import type { Edge, GroupNode, ProjectGraph } from "../../../domain/graph";
import {
  findGroup,
  childGroupsOf,
  modulesInGroup,
  groupImportsOf,
  groupImportedBy,
  diagnosticsForGroup,
} from "../../../domain/graph";
import { EdgeList } from "./EdgeList";
import { MetadataSection } from "./MetadataSection";
import { PanelChrome, Row } from "./PanelParts";

interface GroupInspectionProps {
  graph: ProjectGraph;
  group: GroupNode;
  onHide?: () => void;
}

export function GroupInspection({ graph, group, onHide }: GroupInspectionProps) {
  const parent = group.parentId ? findGroup(graph, group.parentId) : undefined;
  const modules = modulesInGroup(graph, group.id);
  const children = childGroupsOf(graph, group.id);
  const imports = dedupeEndpoints(groupImportsOf(graph, group.id), "target");
  const importedBy = dedupeEndpoints(groupImportedBy(graph, group.id), "source");

  return (
    <PanelChrome onHide={onHide}>
      <h2 style={{ fontSize: 14, margin: "0 0 4px" }}>{group.label}</h2>
      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{group.id}</p>
      <dl style={{ fontSize: 12, margin: "12px 0" }}>
        <Row label="Parent" value={parent?.label ?? "—"} />
        <Row label="Facades" value={facadeLabel(group)} />
        <Row label="Modules" value={String(modules.length)} />
        {children.length > 0 && (
          <Row label="Child groups" value={children.map((g) => g.label).join(", ")} />
        )}
        <Row
          label="Disconnected"
          value={group.disconnectedByDefault ? "By default" : "No"}
        />
      </dl>
      <MetadataSection group={group} />
      {modules.length > 0 && <ModuleList modules={modules} />}
      <EdgeList title="Imports" edges={imports} field="target" />
      <EdgeList title="Imported by" edges={importedBy} field="source" />
      <GroupDiagnostics graph={graph} groupId={group.id} />
    </PanelChrome>
  );
}

function facadeLabel(group: GroupNode): string {
  if (group.facadeModuleIds.length === 0) return "None";
  return group.facadeModuleIds.join(", ");
}

function ModuleList({ modules }: { modules: { id: string; label: string }[] }) {
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Member modules</h3>
      <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
        {modules.map((m) => (
          <li key={m.id}>{m.label}</li>
        ))}
      </ul>
    </div>
  );
}

function GroupDiagnostics({
  graph,
  groupId,
}: {
  graph: ProjectGraph;
  groupId: string;
}) {
  const items = diagnosticsForGroup(graph, groupId);
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Diagnostics</h3>
      <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
        {items.map((d) => (
          <li key={d.id} style={{ color: diagnosticColor(d.kind) }}>
            {d.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function diagnosticColor(kind: string): string {
  return kind === "architectureViolation" ? "#dc2626" : "#b45309";
}

/** One row per external endpoint so group lists stay readable. */
function dedupeEndpoints(edges: Edge[], field: "source" | "target"): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of edges) {
    const id = e[field];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(e);
  }
  return out;
}
