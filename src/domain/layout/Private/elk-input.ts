import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api";
import type { ProjectGraph } from "../../graph";
import type { LayoutOptions } from "./layout-types";
import { symbolBoxId } from "../../graph/Private/symbol-id";
import { SYMBOL_BOX, symbolBoxWidth } from "./symbol-box-metrics";

/** Deterministic layout presets (TDD §"layout presets"). */
export const PRESETS = {
  moduleWidth: 160,
  moduleHeight: 44,
  /** Minimum footprint for each exported-symbol box (grows with label length). */
  symbolWidth: SYMBOL_BOX.minWidth,
  symbolHeight: SYMBOL_BOX.height,
  moduleSymbolPadding: 6,
  moduleHeaderHeight: 20,
  groupPadding: 12,
  groupHeaderHeight: 30,
  nodeSpacing: 32,
  layerSpacing: 56,
  /**
   * A collapsed (childless) group keeps a full card footprint — it must NOT
   * shrink to a tiny stub when its modules disappear. Sized to hold a large
   * label + a few wrapped description lines (see GroupNodeView).
   */
  collapsedGroupWidth: 300,
  collapsedGroupHeight: 168,
} as const;

const ROOT_OPTIONS: Record<string, string> = {
  "elk.algorithm": "rectpacking",
  "elk.aspectRatio": "1.6",
  "elk.spacing.nodeNode": String(PRESETS.nodeSpacing),
};

const GROUP_LAYOUT_OPTIONS: Record<string, string> = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.spacing.nodeNode": String(PRESETS.nodeSpacing),
  "elk.layered.spacing.nodeNodeBetweenLayers": String(PRESETS.layerSpacing),
};

const GROUP_OPTIONS: Record<string, string> = {
  "elk.padding": `[top=${PRESETS.groupPadding + PRESETS.groupHeaderHeight},left=${PRESETS.groupPadding},bottom=${PRESETS.groupPadding},right=${PRESETS.groupPadding}]`,
};

const MODULE_COMPOUND_OPTIONS: Record<string, string> = {
  "elk.algorithm": "rectpacking",
  "elk.aspectRatio": "1.35",
  "elk.spacing.nodeNode": "4",
  "elk.padding": `[top=${PRESETS.moduleHeaderHeight + PRESETS.moduleSymbolPadding},left=${PRESETS.moduleSymbolPadding},bottom=${PRESETS.moduleSymbolPadding},right=${PRESETS.moduleSymbolPadding}]`,
};

/** Builds the hierarchical ELK graph from a `ProjectGraph` (deterministic, sorted). */
export function buildElkGraph(graph: ProjectGraph, options?: LayoutOptions): ElkNode {
  const childGroups = byParent(graph);
  const modulesByGroup = byGroup(graph);
  const moduleById = new Map(graph.modules.map((m) => [m.id, m]));
  const moduleWidth = options?.moduleWidth ?? PRESETS.moduleWidth;
  const moduleHeight = options?.moduleHeight ?? PRESETS.moduleHeight;

  const build = (parentId: string | null): ElkNode[] => {
    const groups = (childGroups.get(parentId) ?? []).map((id) =>
      groupElkNode(id, build(id), options?.collapsedGroupSizes),
    );
    const modules = (modulesByGroup.get(parentId) ?? []).map((id) => {
      const mod = moduleById.get(id)!;
      return moduleElkNode(id, mod.exportedSymbols, moduleWidth, moduleHeight);
    });
    return [...groups, ...modules];
  };

  return {
    id: "root",
    layoutOptions: ROOT_OPTIONS,
    children: build(null),
    edges: buildEdges(graph),
  };
}

/** Modules with symbols are compound nodes: symbol boxes pack inside a fixed footprint. */
function moduleElkNode(
  moduleId: string,
  symbols: string[],
  fallbackWidth: number,
  fallbackHeight: number,
): ElkNode {
  if (symbols.length === 0) {
    return { id: moduleId, width: fallbackWidth, height: fallbackHeight };
  }
  return {
    id: moduleId,
    layoutOptions: MODULE_COMPOUND_OPTIONS,
    children: symbols.map((name) => ({
      id: symbolBoxId(moduleId, name),
      width: symbolBoxWidth(name),
      height: PRESETS.symbolHeight,
    })),
  };
}

type SizeMap = LayoutOptions["collapsedGroupSizes"];

/** A group node; a collapsed (childless) group keeps its expanded footprint when
 *  known, else a generous fallback card — never the shrunken stub. */
function groupElkNode(id: string, children: ElkNode[], sizes?: SizeMap): ElkNode {
  if (children.length === 0) {
    const kept = sizes?.get(id);
    return {
      id,
      width: kept?.width ?? PRESETS.collapsedGroupWidth,
      height: kept?.height ?? PRESETS.collapsedGroupHeight,
    };
  }
  return {
    id,
    layoutOptions: { ...GROUP_LAYOUT_OPTIONS, ...GROUP_OPTIONS },
    children,
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
