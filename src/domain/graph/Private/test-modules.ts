// @Architecture(descriptionShort="Detects test modules and filters them from a ProjectGraph")
import type { ProjectGraph } from "../ProjectGraph";

const TEST_FILE = /\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/i;
const TEST_DIR = /(^|\/)(__tests__|tests|test)(\/|$)/;

/** True when a repo-relative module path looks like a test file. */
export function isTestModule(path: string): boolean {
  if (TEST_FILE.test(path)) return true;
  return TEST_DIR.test(path);
}

/** Drop test modules, edges touching them, and groups with no remaining modules. */
export function filterTestModules(graph: ProjectGraph): ProjectGraph {
  const hidden = new Set(
    graph.modules.filter((m) => isTestModule(m.path)).map((m) => m.id),
  );
  if (hidden.size === 0) return graph;

  const modules = graph.modules.filter((m) => !hidden.has(m.id));
  const moduleIds = new Set(modules.map((m) => m.id));
  const edges = graph.edges.filter(
    (e) => moduleIds.has(e.source) && moduleIds.has(e.target),
  );

  const modulesPerGroup = new Map<string, number>();
  for (const m of modules) {
    if (!m.groupId) continue;
    modulesPerGroup.set(m.groupId, (modulesPerGroup.get(m.groupId) ?? 0) + 1);
  }

  const groupHasModules = (groupId: string): boolean => {
    if ((modulesPerGroup.get(groupId) ?? 0) > 0) return true;
    return graph.groups
      .filter((g) => g.parentId === groupId)
      .some((g) => groupHasModules(g.id));
  };

  const groups = graph.groups.filter((g) => groupHasModules(g.id));
  return { ...graph, groups, modules, edges };
}
