// @Architecture(descriptionShort="Inspection details for a selected module node")
import type { Edge, ModuleNode, ProjectGraph } from "../../../domain/graph";
import {
  findGroup,
  groupOf,
  importsOf,
  importedBy,
  softEdgesOf,
  diagnosticsFor,
} from "../../../domain/graph";
import type { GraphDiffOverlay } from "../../../domain/diff";
import { EdgeList } from "./EdgeList";
import { SoftEdgeSections } from "./SoftEdgeSections";
import { MetadataSection } from "./MetadataSection";
import { ModuleLink, PanelChrome, Row } from "./PanelParts";
import { DiagnosticsList } from "./DiagnosticsList";
import { SymbolList } from "./SymbolList";
import { ModuleHeatRows } from "./ModuleHeatRows";

interface ModuleInspectionProps {
  graph: ProjectGraph;
  module: ModuleNode;
  diffOverlay?: GraphDiffOverlay | null;
  hideTests: boolean;
  metricsWindowDays: number;
  onHide?: () => void;
  onNavigateToModule: (moduleId: string) => void;
  onReviewNotes?: () => void;
}

export function ModuleInspection({
  graph,
  module,
  diffOverlay,
  hideTests,
  metricsWindowDays,
  onHide,
  onNavigateToModule,
  onReviewNotes,
}: ModuleInspectionProps) {
  const group = groupOf(graph, module.id) ?? (module.groupId ? findGroup(graph, module.groupId) : undefined);
  const isDeleted = Boolean(diffOverlay?.deletedModuleIds.has(module.id));
  const renamedTo = diffOverlay?.renamePairs?.find((p) => p.from === module.id)?.to;
  const renamedFrom = diffOverlay?.renamePairs?.find((p) => p.to === module.id)?.from;
  const removedEdges = diffOverlay?.removedEdges ?? [];
  const imports = dedupeEdges([
    ...importsOf(graph, module.id),
    ...removedEdges.filter((e) => e.kind === "import" && e.source === module.id),
  ]);
  const imported = dedupeEdges([
    ...importedBy(graph, module.id),
    ...removedEdges.filter((e) => e.kind === "import" && e.target === module.id),
  ]);

  return (
    <PanelChrome onHide={onHide} onTabChange={(tab) => { if (tab === "review-notes") onReviewNotes?.(); }}>
      <h2 style={{ fontSize: 14, margin: "0 0 4px" }}>{module.label}</h2>
      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{module.path}</p>
      <dl style={{ fontSize: 12, margin: "12px 0" }}>
        <Row label="Group" value={group?.label ?? "—"} />
        <Row label="Facade" value={module.isFacade ? "Yes" : "No"} />
        <Row label="Language" value={module.language} />
        <Row label="LOC" value={String(module.metrics.loc)} />
        <DiffRenameRows
          isDeleted={isDeleted}
          renamedTo={renamedTo}
          renamedFrom={renamedFrom}
          onNavigateToModule={onNavigateToModule}
        />
        <ModuleHeatRows
          graph={graph}
          module={module}
          hideTests={hideTests}
          metricsWindowDays={metricsWindowDays}
        />
      </dl>
      <MetadataSection module={module} group={group} />
      <SymbolList symbols={module.exportedSymbols} language={module.language} />
      <EdgeList
        title="Imports"
        edges={imports}
        field="target"
        onItemClick={onNavigateToModule}
      />
      <EdgeList
        title="Imported by"
        edges={imported}
        field="source"
        onItemClick={onNavigateToModule}
      />
      <SoftEdgeSections edges={softEdgesOf(graph, module.id)} moduleId={module.id} />
      <DiagnosticsList items={diagnosticsFor(graph, module.id)} />
    </PanelChrome>
  );
}

function DiffRenameRows({
  isDeleted,
  renamedTo,
  renamedFrom,
  onNavigateToModule,
}: {
  isDeleted: boolean;
  renamedTo?: string;
  renamedFrom?: string;
  onNavigateToModule: (moduleId: string) => void;
}) {
  if (isDeleted) {
    return (
      <>
        <Row label="Status" value="Deleted" />
        {renamedTo ? (
          <Row
            label="Renamed to"
            value={<ModuleLink moduleId={renamedTo} onClick={onNavigateToModule} />}
          />
        ) : (
          <Row label="Renamed" value="No" />
        )}
      </>
    );
  }
  if (renamedFrom) {
    return (
      <Row
        label="Renamed from"
        value={<ModuleLink moduleId={renamedFrom} onClick={onNavigateToModule} />}
      />
    );
  }
  return null;
}

function dedupeEdges(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of edges) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

