import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api";
import { symbolBoxId, type ProjectGraph, type GroupNode } from "../../graph";
import type { LayoutOptions } from "./layout-types";
import { SYMBOL_BOX, symbolBoxWidth } from "./symbol-box-metrics";
import { moduleBoxSize, descriptionBoxSize } from "./module-box-metrics";

/** Layout id of a group's in-body description box (a non-module leaf child). */
export function descriptionBoxId(groupId: string): string {
  return `${groupId}::__description__`;
}

/** The text the description box must hold (long preferred — it shows at L1.5). */
function descriptionText(group: GroupNode): string | undefined {
  return group.annotation?.descriptionLong ?? group.annotation?.descriptionShort;
}

/** Deterministic layout presets (TDD §"layout presets"). */
export const PRESETS = {
  moduleWidth: 120,
  moduleHeight: 90,
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
  // Honor child order within a layer so the prepended description box stays at
  // the top of its (leftmost) column — i.e. the group's top-left corner. Keep
  // disconnected nodes (e.g. an isolated description box) in the same flow so
  // model order applies to them too, instead of being packed separately.
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.separateConnectedComponents": "false",
};

const GROUP_OPTIONS: Record<string, string> = {
  "elk.padding": `[top=${PRESETS.groupPadding + PRESETS.groupHeaderHeight},left=${PRESETS.groupPadding},bottom=${PRESETS.groupPadding},right=${PRESETS.groupPadding}]`,
};

const MODULE_COMPOUND_OPTIONS: Record<string, string> = {
  "elk.algorithm": "rectpacking",
  // elk.aspectRatio is set per-node to the box's clamped aspect (see moduleElkNode).
  "elk.spacing.nodeNode": "4",
  "elk.padding": `[top=${PRESETS.moduleHeaderHeight + PRESETS.moduleSymbolPadding},left=${PRESETS.moduleSymbolPadding},bottom=${PRESETS.moduleSymbolPadding},right=${PRESETS.moduleSymbolPadding}]`,
};

/** Builds the hierarchical ELK graph from a `ProjectGraph` (deterministic, sorted). */
export function buildElkGraph(graph: ProjectGraph, options?: LayoutOptions): ElkNode {
  const childGroups = byParent(graph);
  const modulesByGroup = byGroup(graph);
  const moduleById = new Map(graph.modules.map((m) => [m.id, m]));
  const groupById = new Map(graph.groups.map((g) => [g.id, g]));
  const moduleWidth = options?.moduleWidth ?? PRESETS.moduleWidth;
  const moduleHeight = options?.moduleHeight ?? PRESETS.moduleHeight;

  // Prepend a description box (sized to its prose) into the group's flow so ELK
  // packs the modules around it — never as a full-width band. Only for expanded
  // groups (those that have other children); a collapsed group renders its own card.
  const withDescription = (groupId: string, children: ElkNode[]): ElkNode[] => {
    if (children.length === 0) return children;
    const text = descriptionText(groupById.get(groupId)!);
    if (!text) return children;
    const desc: ElkNode = {
      id: descriptionBoxId(groupId),
      ...descriptionBoxSize(text),
      // Pin to the first (leftmost) layer + first model-order slot → top-left corner.
      layoutOptions: { "elk.layered.layering.layerConstraint": "FIRST" },
    };
    return [desc, ...children];
  };

  const build = (parentId: string | null): ElkNode[] => {
    const groups = (childGroups.get(parentId) ?? []).map((id) =>
      groupElkNode(
        groupById.get(id)!,
        withDescription(id, build(id)),
        options?.collapsedGroupSizes,
      ),
    );
    const modules = (modulesByGroup.get(parentId) ?? []).map((id) => {
      const mod = moduleById.get(id)!;
      const fit = moduleBoxSize(mod.label, mod.exportedSymbols);
      const width = Math.max(moduleWidth, fit.width);
      const height = Math.max(moduleHeight, fit.height);
      return moduleElkNode(id, mod.exportedSymbols, width, height);
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
    // Pin the compound footprint to the aspect-clamped size (`moduleBoxSize`):
    // the minimum holds the box at that size and the inner packing targets the
    // same aspect, so symbol boxes stay inside the chosen viewport.
    layoutOptions: {
      ...MODULE_COMPOUND_OPTIONS,
      "elk.aspectRatio": (fallbackWidth / fallbackHeight).toFixed(3),
      "elk.nodeSize.constraints": "NODE_LABELS MINIMUM_SIZE",
      "elk.nodeSize.minimum": `(${fallbackWidth},${fallbackHeight})`,
    },
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
function groupElkNode(group: GroupNode, children: ElkNode[], sizes?: SizeMap): ElkNode {
  if (children.length === 0) {
    const kept = sizes?.get(group.id);
    return {
      id: group.id,
      width: kept?.width ?? PRESETS.collapsedGroupWidth,
      height: kept?.height ?? PRESETS.collapsedGroupHeight,
    };
  }
  return {
    id: group.id,
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
