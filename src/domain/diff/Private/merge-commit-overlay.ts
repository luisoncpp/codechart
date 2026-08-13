// @Architecture(descriptionShort="Merges git path overlay with structural graph diff results")
import type { ModuleNode, ProjectGraph } from "../../graph";
import type { GraphDiffCore } from "./types";

/** Merge git path overlay with structural graph diff (edges, deleted modules). */
export function mergeCommitOverlay(
  pathOverlay: Omit<GraphDiffCore, "beforeLayout">,
  graphOverlay: Omit<GraphDiffCore, "beforeLayout">,
  before: ProjectGraph,
): Omit<GraphDiffCore, "beforeLayout"> {
  const affectedModuleIds = new Set([
    ...pathOverlay.affectedModuleIds,
    ...graphOverlay.affectedModuleIds,
  ]);
  const deletedModuleIds = mergeDeletedIds(pathOverlay, graphOverlay);
  const ghostModules = ghostModulesForDeleted(
    before.modules,
    deletedModuleIds,
    pathOverlay.ghostModules,
  );
  return {
    affectedModuleIds,
    deletedModuleIds,
    addedSymbolIds: graphOverlay.addedSymbolIds,
    removedSymbolIds: graphOverlay.removedSymbolIds,
    modifiedSymbolIds: graphOverlay.modifiedSymbolIds,
    addedEdgeIds: new Set([...pathOverlay.addedEdgeIds, ...graphOverlay.addedEdgeIds]),
    addedEdges: [...(pathOverlay.addedEdges ?? []), ...(graphOverlay.addedEdges ?? [])],
    removedEdges: [...pathOverlay.removedEdges, ...graphOverlay.removedEdges],
    ghostModules,
  };
}

function mergeDeletedIds(
  pathOverlay: Omit<GraphDiffCore, "beforeLayout">,
  graphOverlay: Omit<GraphDiffCore, "beforeLayout">,
): Set<string> {
  return new Set([...pathOverlay.deletedModuleIds, ...graphOverlay.deletedModuleIds]);
}

function ghostModulesForDeleted(
  modules: ModuleNode[],
  deletedModuleIds: ReadonlySet<string>,
  fallbackGhosts: readonly ModuleNode[] = [],
): ModuleNode[] {
  const fromBefore = modules.filter((mod) => deletedModuleIds.has(mod.id));
  const beforeIds = new Set(fromBefore.map((m) => m.id));
  const missing = fallbackGhosts.filter(
    (g) => deletedModuleIds.has(g.id) && !beforeIds.has(g.id),
  );
  return [...fromBefore, ...missing];
}
