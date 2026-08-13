// @Architecture(descriptionShort="Builds a module-only diff overlay from pasted unified diff text")
import type { Language, ModuleNode, ProjectGraph } from "../../graph";
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
    else ghostModules.push(minimalGhostModule(path, graph));
  }

  return {
    affectedModuleIds,
    deletedModuleIds,
    addedSymbolIds: new Set(),
    removedSymbolIds: new Set(),
    modifiedSymbolIds: new Set(),
    addedEdgeIds: new Set(),
    removedEdges: [],
    ghostModules,
  };
}

function inferGroupIdForPath(path: string, graph: ProjectGraph): string | null {
  const segments = path.split("/");
  for (let i = segments.length - 1; i >= 1; i--) {
    const dir = segments.slice(0, i).join("/");
    const sibling = graph.modules.find(
      (m) => m.path.startsWith(dir + "/") && m.groupId !== null,
    );
    if (sibling?.groupId) return sibling.groupId;

    const group = graph.groups.find(
      (g) => g.id === dir || g.id.endsWith("/" + dir) || dir.endsWith("/" + g.id) || g.id === segments[i - 1],
    );
    if (group) return group.id;
  }
  return null;
}

function inferLanguageForPath(path: string): Language {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (ext === ".rs") return "rust";
  if (ext === ".cpp" || ext === ".cc" || ext === ".cxx" || ext === ".c" || ext === ".hpp" || ext === ".h") return "cpp";
  if (ext === ".cs") return "csharp";
  if (ext === ".tsx") return "tsx";
  if (ext === ".css") return "css";
  if (ext === ".prefab") return "unityPrefab";
  return "typescript";
}

function minimalGhostModule(path: string, graph?: ProjectGraph): ModuleNode {
  const label = path.split("/").pop() ?? path;
  const groupId = graph ? inferGroupIdForPath(path, graph) : null;
  return {
    id: path,
    path,
    label,
    language: inferLanguageForPath(path),
    groupId,
    isFacade: false,
    metrics: { loc: 0 },
    exportedSymbols: [],
  };
}
