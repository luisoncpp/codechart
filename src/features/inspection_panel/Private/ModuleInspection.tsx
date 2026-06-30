// @Architecture(descriptionShort="Inspection details for a selected module node")
import type { ProjectGraph } from "../../../domain/graph";
import {
  groupOf,
  importsOf,
  importedBy,
  softEdgesOf,
  diagnosticsFor,
} from "../../../domain/graph";
import type { ModuleNode } from "../../../domain/graph";
import { EdgeList } from "./EdgeList";
import { SoftEdgeSections } from "./SoftEdgeSections";
import { MetadataSection } from "./MetadataSection";
import { PanelChrome, Row } from "./PanelParts";
import { SymbolList } from "./SymbolList";
import { ModuleHeatRows } from "./ModuleHeatRows";

interface ModuleInspectionProps {
  graph: ProjectGraph;
  module: ModuleNode;
  hideTests: boolean;
  onHide?: () => void;
}

export function ModuleInspection({ graph, module, hideTests, onHide }: ModuleInspectionProps) {
  const group = groupOf(graph, module.id);
  return (
    <PanelChrome onHide={onHide}>
      <h2 style={{ fontSize: 14, margin: "0 0 4px" }}>{module.label}</h2>
      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{module.path}</p>
      <dl style={{ fontSize: 12, margin: "12px 0" }}>
        <Row label="Group" value={group?.label ?? "—"} />
        <Row label="Facade" value={module.isFacade ? "Yes" : "No"} />
        <Row label="Language" value={module.language} />
        <Row label="LOC" value={String(module.metrics.loc)} />
        <ModuleHeatRows graph={graph} module={module} hideTests={hideTests} />
      </dl>
      <MetadataSection module={module} group={group} />
      <SymbolList symbols={module.exportedSymbols} language={module.language} />
      <EdgeList title="Imports" edges={importsOf(graph, module.id)} field="target" />
      <EdgeList
        title="Imported by"
        edges={importedBy(graph, module.id)}
        field="source"
      />
      <SoftEdgeSections edges={softEdgesOf(graph, module.id)} moduleId={module.id} />
      <Diagnostics graph={graph} moduleId={module.id} />
    </PanelChrome>
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
