import { GraphSessionStore, useGraphSession } from "../../../state/graph-session";
import {
  findModule,
  groupOf,
  importsOf,
  importedBy,
  diagnosticsFor,
} from "../../../domain/graph";
import { EdgeList } from "./EdgeList";

interface InspectionPanelProps {
  store: GraphSessionStore;
}

export function InspectionPanel({ store }: InspectionPanelProps) {
  const session = useGraphSession(store);
  const graph = session.getGraph();
  const selectedId = session.getSelectedId();
  const module = graph && selectedId ? findModule(graph, selectedId) : undefined;

  if (!graph || !module) {
    return (
      <aside style={panelStyle}>
        <p style={{ color: "#64748b" }}>Select a module to inspect it.</p>
      </aside>
    );
  }

  const group = groupOf(graph, module.id);
  return (
    <aside style={panelStyle}>
      <h2 style={{ fontSize: 14, margin: "0 0 4px" }}>{module.label}</h2>
      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{module.path}</p>
      <dl style={{ fontSize: 12, margin: "12px 0" }}>
        <Row label="Group" value={group?.label ?? "—"} />
        <Row label="Facade" value={module.isFacade ? "Yes" : "No"} />
        <Row label="Language" value={module.language} />
        <Row label="LOC" value={String(module.metrics.loc)} />
      </dl>
      <EdgeList title="Imports" edges={importsOf(graph, module.id)} field="target" />
      <EdgeList
        title="Imported by"
        edges={importedBy(graph, module.id)}
        field="source"
      />
      <Diagnostics graph={graph} moduleId={module.id} />
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <dt style={{ fontWeight: 600, minWidth: 70 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </div>
  );
}

function Diagnostics({
  graph,
  moduleId,
}: {
  graph: Parameters<typeof diagnosticsFor>[0];
  moduleId: string;
}) {
  const items = diagnosticsFor(graph, moduleId);
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, margin: "0 0 4px" }}>Diagnostics</h3>
      <ul style={{ fontSize: 12, paddingLeft: 16, margin: 0 }}>
        {items.map((d) => (
          // Architecture violations match the red bypass edge; others stay amber.
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

const panelStyle = {
  width: 280,
  padding: 16,
  borderLeft: "1px solid #e2e8f0",
  background: "#f8fafc",
  overflowY: "auto",
  fontFamily: "sans-serif",
} as const;
