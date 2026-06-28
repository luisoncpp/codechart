import type { Edge, ModuleNode } from "../../graph";
import type { GraphDiffInput, GraphDiffCore } from "./types";

/** Compare two analyzed graphs and derive canvas overlay data. */
export function compareGraphs(input: GraphDiffInput): Omit<GraphDiffCore, "beforeLayout"> {
  const { before, after } = input;
  const beforeMods = indexModules(before.modules);
  const afterMods = indexModules(after.modules);

  const affectedModuleIds = new Set<string>();
  const deletedModuleIds = new Set<string>();

  for (const id of afterMods.keys()) {
    if (!beforeMods.has(id)) affectedModuleIds.add(id);
  }
  for (const id of beforeMods.keys()) {
    if (!afterMods.has(id)) deletedModuleIds.add(id);
  }

  const beforeEdges = indexEdges(before.edges);
  const afterEdges = indexEdges(after.edges);
  const addedEdgeIds = new Set<string>();
  const removedEdges: Edge[] = [];

  for (const [id, edge] of afterEdges) {
    if (!beforeEdges.has(id)) addedEdgeIds.add(id);
  }
  for (const [id, edge] of beforeEdges) {
    if (!afterEdges.has(id)) removedEdges.push(edge);
  }

  const ghostModules = before.modules.filter((m) => deletedModuleIds.has(m.id));
  return { affectedModuleIds, deletedModuleIds, addedEdgeIds, removedEdges, ghostModules };
}

function indexModules(modules: ModuleNode[]): Map<string, ModuleNode> {
  return new Map(modules.map((m) => [m.id, m]));
}

function indexEdges(edges: Edge[]): Map<string, Edge> {
  return new Map(edges.map((e) => [e.id, e]));
}
