// @Architecture(descriptionShort="Internal ELK node and edge construction helpers for buildElkGraph")
import type { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk-api";
import type { ProjectGraph } from "../../graph/ProjectGraph";
import type { GroupNode } from "../../graph/GroupNode";
import { symbolBoxId } from "../../graph/symbol-id";
import type { LayoutOptions } from "./layout-types";
import { PRESETS } from "./layout-presets";
import { symbolBoxWidth } from "./symbol-box-metrics";
import { wrappedDescriptionHeight } from "./module-box-metrics";

export const ROOT_OPTIONS: Record<string, string> = {
  "elk.algorithm": "rectpacking",
  "elk.aspectRatio": "1.6",
  "elk.spacing.nodeNode": String(PRESETS.nodeSpacing),
};

const GROUP_LAYERED_OPTIONS: Record<string, string> = {
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

/** Edgeless groups (handlers, services barrels, etc.) pack into a screen-shaped
 *  grid instead of one tall column — layered only when intra-group imports exist. */
const GROUP_REPACK_OPTIONS: Record<string, string> = {
  "elk.algorithm": "rectpacking",
  "elk.aspectRatio": "1.6",
  "elk.spacing.nodeNode": String(PRESETS.nodeSpacing),
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

/** Modules with symbols are compound nodes: symbol boxes pack inside a fixed footprint. */
export function moduleElkNode(
  moduleId: string,
  symbols: string[],
  fallbackWidth: number,
  fallbackHeight: number,
  descriptionShort?: string,
): ElkNode {
  if (symbols.length === 0) {
    return { id: moduleId, width: fallbackWidth, height: fallbackHeight };
  }
  const layoutOptions: Record<string, string> = {
    ...MODULE_COMPOUND_OPTIONS,
    "elk.aspectRatio": (fallbackWidth / fallbackHeight).toFixed(3),
    "elk.nodeSize.constraints": "NODE_LABELS MINIMUM_SIZE",
    "elk.nodeSize.minimum": `(${fallbackWidth},${fallbackHeight})`,
  };

  if (descriptionShort) {
    const descH = wrappedDescriptionHeight(descriptionShort, fallbackWidth);
    const padTop = PRESETS.moduleHeaderHeight + PRESETS.moduleSymbolPadding + descH;
    layoutOptions["elk.padding"] = `[top=${padTop},left=${PRESETS.moduleSymbolPadding},bottom=${PRESETS.moduleSymbolPadding},right=${PRESETS.moduleSymbolPadding}]`;
  }

  return {
    id: moduleId,
    // Pin the compound footprint to the aspect-clamped size (`moduleBoxSize`):
    // the minimum holds the box at that size and the inner packing targets the
    // same aspect, so symbol boxes stay inside the chosen viewport.
    layoutOptions,
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
export function groupElkNode(
  group: GroupNode,
  children: ElkNode[],
  layered: boolean,
  hasNestedGroups: boolean,
  sizes?: SizeMap,
): ElkNode {
  if (children.length === 0) {
    const kept = sizes?.get(group.id);
    return {
      id: group.id,
      width: kept?.width ?? PRESETS.collapsedGroupWidth,
      height: kept?.height ?? PRESETS.collapsedGroupHeight,
    };
  }
  const repack = hasNestedGroups
    ? { ...GROUP_REPACK_OPTIONS, "elk.aspectRatio": "2.5" }
    : GROUP_REPACK_OPTIONS;
  const layout = layered ? GROUP_LAYERED_OPTIONS : repack;
  return {
    id: group.id,
    layoutOptions: { ...layout, ...GROUP_OPTIONS },
    children,
  };
}

/** Layered only for flat module groups with import edges. Containers that nest
 *  subgroups always repack: layered stacks same-layer siblings vertically, so
 *  unrelated subgroups (e.g. map-editor beside pane-workspace) waste horizontal space. */
export function shouldUseLayeredGroup(
  graph: ProjectGraph,
  groupId: string,
  nestedChildIds: string[],
): boolean {
  if (nestedChildIds.length > 0) return false;
  return hasIntraGroupEdges(graph, groupId);
}

/** True when at least one import edge connects two direct members of `groupId`. */
function hasIntraGroupEdges(graph: ProjectGraph, groupId: string): boolean {
  const members = new Set(
    graph.modules.filter((m) => m.groupId === groupId).map((m) => m.id),
  );
  if (members.size < 2) return false;
  return graph.edges.some((e) => members.has(e.source) && members.has(e.target));
}

export function buildEdges(graph: ProjectGraph): ElkExtendedEdge[] {
  return [...graph.edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] }));
}

export function byParent(graph: ProjectGraph): Map<string | null, string[]> {
  const map = new Map<string | null, string[]>();
  for (const g of sortedById(graph.groups)) push(map, g.parentId, g.id);
  return map;
}

export function byGroup(graph: ProjectGraph): Map<string | null, string[]> {
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

/** Defense in depth: stale analysis may still carry duplicate export names. */
export function uniqueSymbols(symbols: readonly string[]): string[] {
  return [...new Set(symbols)];
}
