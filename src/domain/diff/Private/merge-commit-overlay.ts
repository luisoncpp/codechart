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
  const ghostModules = ghostModulesForDeleted(before.modules, deletedModuleIds);
  return {
    affectedModuleIds,
    deletedModuleIds,
    addedEdgeIds: graphOverlay.addedEdgeIds,
    removedEdges: graphOverlay.removedEdges,
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
): ModuleNode[] {
  return modules.filter((mod) => deletedModuleIds.has(mod.id));
}
