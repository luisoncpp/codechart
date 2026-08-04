// @Architecture(descriptionShort="Drops modules and edges under git submodule roots")
import type { ProjectGraph } from "../../graph";

/** Return a graph without modules (and their edges) under submodule roots. */
export function excludeSubmoduleModules(
  graph: ProjectGraph,
  submoduleRoots: readonly string[],
): ProjectGraph {
  if (submoduleRoots.length === 0) return graph;
  const modules = graph.modules.filter((module) => !underRoot(module.path, submoduleRoots));
  const kept = new Set(modules.map((module) => module.id));
  const edges = graph.edges.filter(
    (edge) => kept.has(edge.source) && kept.has(edge.target),
  );
  return { ...graph, modules, edges };
}

export function underSubmoduleRoot(
  path: string,
  submoduleRoots: readonly string[],
): boolean {
  return underRoot(path, submoduleRoots);
}

function underRoot(path: string, roots: readonly string[]): boolean {
  return roots.some((root) => path === root || path.startsWith(`${root}/`));
}
