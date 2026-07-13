// @Architecture(descriptionShort="Maps a module's clickable symbol names to their defining modules")
import type { ModuleNode, ProjectGraph } from "../../../../domain/graph";
import { scanFunctionDefinitions } from "./function-definition-scanner";

export interface SymbolTarget {
  moduleId: string;
  path: string;
}

/**
 * Every symbol name a module can reach through its import edges, mapped to
 * the module that exports it. First exporter wins on name collisions.
 */
export function importedSymbolTargets(
  graph: ProjectGraph,
  moduleId: string,
): Map<string, SymbolTarget> {
  const targets = new Map<string, SymbolTarget>();
  for (const module of importedModules(graph, moduleId)) {
    for (const symbol of module.exportedSymbols) {
      if (!targets.has(symbol)) {
        targets.set(symbol, { moduleId: module.id, path: module.path });
      }
    }
  }
  return targets;
}

/**
 * Full clickable-name map for a preview frame. Priority on collisions:
 * own-module function/method definitions (a locally defined name cannot
 * also be imported) > imported exported symbols > functions/methods scanned
 * from imported modules' sources (methods of imported classes).
 */
export function combinedSymbolTargets(
  graph: ProjectGraph,
  moduleId: string,
  sources: ReadonlyMap<string, string>,
): Map<string, SymbolTarget> {
  const targets = new Map<string, SymbolTarget>();
  const own = graph.modules.find((m) => m.id === moduleId);
  if (own) addScannedDefinitions(targets, own, sources.get(own.id));
  for (const [name, target] of importedSymbolTargets(graph, moduleId)) {
    if (!targets.has(name)) targets.set(name, target);
  }
  for (const module of importedModules(graph, moduleId)) {
    addScannedDefinitions(targets, module, sources.get(module.id));
  }
  return targets;
}

/** The frame's own module plus its import targets — the sources worth prefetching. */
export function sourcePrefetchIds(graph: ProjectGraph, moduleId: string): string[] {
  return [moduleId, ...importedModules(graph, moduleId).map((m) => m.id)];
}

function addScannedDefinitions(
  targets: Map<string, SymbolTarget>,
  module: ModuleNode,
  source: string | undefined,
) {
  if (!source) return;
  for (const name of scanFunctionDefinitions(source).keys()) {
    if (!targets.has(name)) {
      targets.set(name, { moduleId: module.id, path: module.path });
    }
  }
}

function importedModules(graph: ProjectGraph, moduleId: string): ModuleNode[] {
  const modules: ModuleNode[] = [];
  for (const edge of graph.edges) {
    if (edge.source !== moduleId || edge.kind !== "import") continue;
    const module = graph.modules.find((m) => m.id === edge.target);
    if (module) modules.push(module);
  }
  return modules;
}
