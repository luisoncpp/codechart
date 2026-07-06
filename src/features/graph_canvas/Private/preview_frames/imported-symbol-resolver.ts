// @Architecture(descriptionShort="Maps a module's imported symbol names to their defining modules")
import type { ProjectGraph } from "../../../../domain/graph";

export interface SymbolTarget {
  moduleId: string;
  path: string;
}

/**
 * Every symbol name a module can reach through its import edges, mapped to
 * the module that exports it. First exporter wins on name collisions.
 * The key set doubles as "which identifiers are clickable" in a preview frame.
 */
export function importedSymbolTargets(
  graph: ProjectGraph,
  moduleId: string,
): Map<string, SymbolTarget> {
  const targets = new Map<string, SymbolTarget>();
  for (const edge of graph.edges) {
    if (edge.source !== moduleId || edge.kind !== "import") continue;
    const module = graph.modules.find((m) => m.id === edge.target);
    if (!module) continue;
    for (const symbol of module.exportedSymbols) {
      if (!targets.has(symbol)) {
        targets.set(symbol, { moduleId: module.id, path: module.path });
      }
    }
  }
  return targets;
}
