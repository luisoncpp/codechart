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
 * also be imported) > definitions in a C/C++ header's same-stem
 * implementation file (declaration → body) > imported exported symbols >
 * functions/methods scanned from imported modules' sources (methods of
 * imported classes).
 */
export function combinedSymbolTargets(
  graph: ProjectGraph,
  moduleId: string,
  sources: ReadonlyMap<string, string>,
): Map<string, SymbolTarget> {
  const targets = new Map<string, SymbolTarget>();
  const own = graph.modules.find((m) => m.id === moduleId);
  if (own) addScannedDefinitions(targets, own, sources.get(own.id));
  for (const module of implementationModules(graph, moduleId)) {
    addScannedDefinitions(targets, module, sources.get(module.id));
  }
  for (const [name, target] of importedSymbolTargets(graph, moduleId)) {
    if (!targets.has(name)) targets.set(name, target);
  }
  for (const module of importedModules(graph, moduleId)) {
    addScannedDefinitions(targets, module, sources.get(module.id));
  }
  return targets;
}

/** The frame's own module, a header's implementation files, and its import targets. */
export function sourcePrefetchIds(graph: ProjectGraph, moduleId: string): string[] {
  const related = [...implementationModules(graph, moduleId), ...importedModules(graph, moduleId)];
  return [moduleId, ...related.map((m) => m.id)];
}

const HEADER_EXTENSIONS = new Set(["h", "hh", "hpp", "hxx", "inl"]);

/**
 * Same-stem files that include a C/C++ header (`Private/Foo.cpp` → `Public/Foo.h`):
 * the edge points impl → header, so a header frame must look backwards to
 * reach its member definitions. Mirrors the backend's header/impl pairing.
 */
function implementationModules(graph: ProjectGraph, moduleId: string): ModuleNode[] {
  const header = splitFileName(moduleId);
  if (!HEADER_EXTENSIONS.has(header.extension)) return [];
  const modules: ModuleNode[] = [];
  for (const edge of graph.edges) {
    if (edge.target !== moduleId || edge.kind !== "import") continue;
    if (splitFileName(edge.source).stem !== header.stem) continue;
    const module = graph.modules.find((m) => m.id === edge.source);
    if (module) modules.push(module);
  }
  return modules;
}

function splitFileName(path: string): { stem: string; extension: string } {
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return { stem: fileName, extension: "" };
  return { stem: fileName.slice(0, dot), extension: fileName.slice(dot + 1).toLowerCase() };
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
