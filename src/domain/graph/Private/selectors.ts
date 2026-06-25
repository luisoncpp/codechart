// @Architecture(descriptionShort="Selector functions for querying the projected graph state")
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

/** Import edges where the given module is the importer (outgoing). */
export function importsOf(graph: ProjectGraph, id: string): Edge[] {
  return graph.edges.filter((e) => e.kind === "import" && e.source === id);
}

/** Import edges where the given module is imported by others (incoming). */
export function importedBy(graph: ProjectGraph, id: string): Edge[] {
  return graph.edges.filter((e) => e.kind === "import" && e.target === id);
}

/** Soft (event/runtime) edges touching the given module, either endpoint. */
export function softEdgesOf(graph: ProjectGraph, id: string): Edge[] {
  return graph.edges.filter(
    (e) => e.kind === "soft" && (e.source === id || e.target === id),
  );
}

/** Soft edges touching the module whose trigger starts with the given prefix. */
export function softEdgesByTrigger(
  graph: ProjectGraph,
  id: string,
  prefix: string,
): Edge[] {
  return softEdgesOf(graph, id).filter((e) => e.trigger.startsWith(prefix));
}

export function diagnosticsFor(graph: ProjectGraph, id: string): Diagnostic[] {
  return graph.diagnostics.filter((d) => d.moduleId === id);
}

/** Every facade-bypass (`architectureViolation`) diagnostic in the project. */
export function architectureViolations(graph: ProjectGraph): Diagnostic[] {
  return graph.diagnostics.filter((d) => d.kind === "architectureViolation");
}
