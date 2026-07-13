// @Architecture(descriptionShort="Selector functions for querying the projected graph state")
import type { ProjectGraph } from "../ProjectGraph";
import { isTestModule } from "./test-modules";
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

export function findGroup(
  graph: ProjectGraph,
  id: string,
): GroupNode | undefined {
  return graph.groups.find((g) => g.id === id);
}

/** Direct members of a group (not nested child groups). */
export function modulesInGroup(
  graph: ProjectGraph,
  groupId: string,
): ModuleNode[] {
  return graph.modules.filter((m) => m.groupId === groupId);
}

/** Immediate child groups. */
export function childGroupsOf(
  graph: ProjectGraph,
  groupId: string,
): GroupNode[] {
  return graph.groups.filter((g) => g.parentId === groupId);
}

/** Module ids owned by this group or any nested descendant group. */
export function moduleIdsInGroupTree(
  graph: ProjectGraph,
  groupId: string,
): Set<string> {
  const groupIds = descendantGroupIds(graph, groupId);
  groupIds.add(groupId);
  return new Set(
    graph.modules
      .filter((m) => m.groupId && groupIds.has(m.groupId))
      .map((m) => m.id),
  );
}

function crossBoundaryGroupImports(
  graph: ProjectGraph,
  groupId: string,
  direction: "out" | "in",
): Edge[] {
  const scope = moduleIdsInGroupTree(graph, groupId);
  if (scope.size === 0) return [];
  return graph.edges.filter(
    (e) =>
      e.kind === "import" &&
      (direction === "out"
        ? scope.has(e.source) && !scope.has(e.target)
        : scope.has(e.target) && !scope.has(e.source)),
  );
}

/** Cross-boundary import edges leaving the group's module tree. */
export function groupImportsOf(graph: ProjectGraph, groupId: string): Edge[] {
  return crossBoundaryGroupImports(graph, groupId, "out");
}

/** Cross-boundary import edges entering the group's module tree. */
export function groupImportedBy(graph: ProjectGraph, groupId: string): Edge[] {
  return crossBoundaryGroupImports(graph, groupId, "in");
}

export function diagnosticsForGroup(
  graph: ProjectGraph,
  groupId: string,
): Diagnostic[] {
  const scope = moduleIdsInGroupTree(graph, groupId);
  return graph.diagnostics.filter((d) => d.moduleId && scope.has(d.moduleId));
}

/** Focus target for selection-aware edge styling (module, group box, or tree). */
export type EdgeFocus =
  | string
  | { groupId: string; moduleIds: Set<string> };

export function edgeFocusForSelection(
  graph: ProjectGraph,
  selectedId: string | null,
): EdgeFocus | null {
  if (!selectedId) return null;
  if (findModule(graph, selectedId)) return selectedId;
  if (!findGroup(graph, selectedId)) return selectedId;
  return { groupId: selectedId, moduleIds: moduleIdsInGroupTree(graph, selectedId) };
}

function descendantGroupIds(graph: ProjectGraph, rootId: string): Set<string> {
  const out = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const g of graph.groups) {
      if (g.parentId === id && !out.has(g.id)) {
        out.add(g.id);
        queue.push(g.id);
      }
    }
  }
  return out;
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
  return graph.diagnostics.filter(
    (d) =>
      d.kind === "architectureViolation" &&
      !isTestImporter(graph, d),
  );
}

function isTestImporter(graph: ProjectGraph, diagnostic: Diagnostic): boolean {
  if (!diagnostic.moduleId) return false;
  const module = findModule(graph, diagnostic.moduleId);
  return module ? isTestModule(module.path) : false;
}
