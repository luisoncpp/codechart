import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api";
import type { ProjectGraph } from "../../graph";

/** Deterministic layout presets (TDD §"layout presets"). */
export const PRESETS = {
  moduleWidth: 160,
  moduleHeight: 44,
  groupPadding: 24,
  nodeSpacing: 32,
  layerSpacing: 56,
} as const;

const ROOT_OPTIONS: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.spacing.nodeNode": String(PRESETS.nodeSpacing),
  "elk.layered.spacing.nodeNodeBetweenLayers": String(PRESETS.layerSpacing),
};

const GROUP_OPTIONS: Record<string, string> = {
  "elk.padding": `[top=${PRESETS.groupPadding},left=${PRESETS.groupPadding},bottom=${PRESETS.groupPadding},right=${PRESETS.groupPadding}]`,
};

/** Builds the hierarchical ELK graph from a `ProjectGraph` (deterministic, sorted). */
export function buildElkGraph(graph: ProjectGraph): ElkNode {
  const childGroups = byParent(graph);
  const modulesByGroup = byGroup(graph);

  const build = (parentId: string | null): ElkNode[] => {
    const groups = (childGroups.get(parentId) ?? []).map((id) => ({
      id,
      layoutOptions: GROUP_OPTIONS,
      children: build(id),
    }));
    const modules = (modulesByGroup.get(parentId) ?? []).map((id) => ({
      id,
      width: PRESETS.moduleWidth,
      height: PRESETS.moduleHeight,
    }));
    return [...groups, ...modules];
  };

  return {
    id: "root",
    layoutOptions: ROOT_OPTIONS,
    children: build(null),
    edges: buildEdges(graph),
  };
}

function buildEdges(graph: ProjectGraph): ElkExtendedEdge[] {
  return [...graph.edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] }));
}

function byParent(graph: ProjectGraph): Map<string | null, string[]> {
  const map = new Map<string | null, string[]>();
  for (const g of sortedById(graph.groups)) push(map, g.parentId, g.id);
  return map;
}

function byGroup(graph: ProjectGraph): Map<string | null, string[]> {
  const map = new Map<string | null, string[]>();
  for (const m of sortedById(graph.modules)) push(map, m.groupId, m.id);
  return map;
}

function sortedById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function push(map: Map<string | null, string[]>, key: string | null, id: string) {
  const list = map.get(key) ?? [];
  list.push(id);
  map.set(key, list);
}
