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
import { DiagnosticsList } from "./DiagnosticsList";
import { SymbolList } from "./SymbolList";
import { ModuleHeatRows } from "./ModuleHeatRows";

interface ModuleInspectionProps {
  graph: ProjectGraph;
  module: ModuleNode;
  hideTests: boolean;
  onHide?: () => void;
  onNavigateToModule: (moduleId: string) => void;
}

export function ModuleInspection({
  graph,
  module,
  hideTests,
  onHide,
  onNavigateToModule,
}: ModuleInspectionProps) {
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
      <EdgeList
        title="Imports"
        edges={importsOf(graph, module.id)}
        field="target"
        onItemClick={onNavigateToModule}
      />
      <EdgeList
        title="Imported by"
        edges={importedBy(graph, module.id)}
        field="source"
        onItemClick={onNavigateToModule}
      />
      <SoftEdgeSections edges={softEdgesOf(graph, module.id)} moduleId={module.id} />
      <DiagnosticsList items={diagnosticsFor(graph, module.id)} />
    </PanelChrome>
  );
}
