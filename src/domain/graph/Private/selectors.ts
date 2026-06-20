import type { ProjectGraph } from "../ProjectGraph";
import type { ModuleNode } from "../ModuleNode";
import type { GroupNode } from "../GroupNode";
import type { Edge } from "../Edge";
import type { Diagnostic } from "../Diagnostic";

export function findModule(
  graph: ProjectGraph,
  id: string,
): ModuleNode | undefined {
  return graph.modules.find((m) => m.id === id);
}

export function groupOf(
  graph: ProjectGraph,
  moduleId: string,
): GroupNode | undefined {
  const module = findModule(graph, moduleId);
  if (!module?.groupId) return undefined;
  return graph.groups.find((g) => g.id === module.groupId);
}

/** Edges where the given module is the importer (outgoing). */
export function importsOf(graph: ProjectGraph, id: string): Edge[] {
  return graph.edges.filter((e) => e.source === id);
}

/** Edges where the given module is imported by others (incoming). */
export function importedBy(graph: ProjectGraph, id: string): Edge[] {
  return graph.edges.filter((e) => e.target === id);
}

export function diagnosticsFor(graph: ProjectGraph, id: string): Diagnostic[] {
  return graph.diagnostics.filter((d) => d.moduleId === id);
}
