// @Architecture(descriptionShort="Builds a module-only diff overlay from pasted unified diff text")
import type { ModuleNode, ProjectGraph } from "../../graph";
import { pathsFromUnifiedDiff } from "./parse-unified-diff";
import type { GraphDiffCore } from "./types";

/** Build a module-only overlay from pasted unified diff text. */
export function overlayFromPastedDiff(
  text: string,
  graph: ProjectGraph,
): Omit<GraphDiffCore, "beforeLayout"> {
  const paths = pathsFromUnifiedDiff(text);
  const knownIds = new Set(graph.modules.map((m) => m.id));
  const affectedModuleIds = new Set<string>();
  const deletedModuleIds = new Set<string>();
  const ghostModules: ModuleNode[] = [];

  for (const path of [...paths.modified, ...paths.added]) {
    if (knownIds.has(path)) affectedModuleIds.add(path);
  }
  for (const path of paths.deleted) {
    deletedModuleIds.add(path);
    if (knownIds.has(path)) affectedModuleIds.add(path);
    else ghostModules.push(minimalGhostModule(path));
  }

  return {
    affectedModuleIds,
    deletedModuleIds,
    addedEdgeIds: new Set(),
    removedEdges: [],
    ghostModules,
  };
}

function minimalGhostModule(path: string): ModuleNode {
  const label = path.split("/").pop() ?? path;
  return {
    id: path,
    path,
    label,
    language: "typescript",
    groupId: null,
    isFacade: false,
    metrics: { loc: 0 },
    exportedSymbols: [],
  };
}
