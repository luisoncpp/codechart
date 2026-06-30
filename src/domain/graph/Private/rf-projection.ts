// @Architecture(descriptionShort="Converts internal project graph model to React Flow projection")
import { type LayoutBox, type LayoutedGraph, PRESETS, DESC_BOX } from "../../layout";
import { symbolNameFromId } from "./symbol-id";
import { inferSymbolKind } from "./symbol-kind";
import type { ProjectGraph } from "../ProjectGraph";
import type { GroupNode } from "../GroupNode";
import type { ModuleNode } from "../ModuleNode";
import type { Edge } from "../Edge";
import { groupParentMap, isModuleExpanded } from "./zoom-projection";
import {
  isGroupDisconnected,
  isModuleDisconnected,
} from "./connection-filter";
import type {
  GroupRFNode,
  ModuleRFNode,
  SymbolRFNode,
  ProjectedGraph,
  RFEdgeT,
  RFNode,
} from "./node-data";
import { colorForGroup } from "./colors";
import type { HeatProjection } from "./heat-scores";

type BoxIndex = Map<string, LayoutBox>;

/** Per-render overlay state (semantic zoom): which groups are collapsed and the
 *  lazily-fetched source snippets to show in module boxes at L2. */
export interface RenderOptions {
  collapsedGroupIds?: Set<string>;
  disconnectedGroupIds?: Set<string>;
  disconnectedModuleIds?: Set<string>;
  /** When true, symbol child boxes are emitted (L1.5+). */
  showSymbols?: boolean;
  /** moduleId → source; presence (at L2) turns on the in-box snippet. */
  snippets?: Map<string, string>;
  /** groupId → markdown; presence (at L2) turns on the architecture doc panel. */
  groupDocs?: Map<string, string>;
  /** Normalized heat scores when the heatmap overlay is enabled. */
  heat?: HeatProjection & { mode: "activity" | "risk" };
}

/** Project a `ProjectGraph` + its layout into React Flow nodes/edges (pure). */
export function projectGraph(
  graph: ProjectGraph,
  layout: LayoutedGraph,
  options?: RenderOptions,
): ProjectedGraph {
  const index: BoxIndex = new Map();
  for (const box of [
    ...layout.groups,
    ...layout.modules,
    ...layout.symbols,
    ...layout.descriptions,
  ]) {
    index.set(box.id, box);
  }
  const descriptionByGroup = new Map(layout.descriptions.map((b) => [b.parentId, b]));
  const childBoxesByGroup = byParentId([...layout.modules, ...layout.groups]);
  const groupById = new Map(graph.groups.map((g) => [g.id, g]));
  const moduleById = new Map(graph.modules.map((m) => [m.id, m]));
  const collapsed = options?.collapsedGroupIds;
  const parentOf = groupParentMap(graph);
  const disconnectedGroups = options?.disconnectedGroupIds;
  const disconnectedModules = options?.disconnectedModuleIds;
  const moduleVisible = (m: ModuleNode) =>
    !collapsed?.size || isModuleExpanded(m.groupId, collapsed, parentOf);
  const groupDisconnected = (groupId: string) =>
    !!disconnectedGroups?.size &&
    isGroupDisconnected(groupId, disconnectedGroups, parentOf);
  const moduleDisconnected = (moduleId: string) =>
    (!!disconnectedGroups?.size || !!disconnectedModules?.size) &&
    isModuleDisconnected(moduleId, graph, disconnectedGroups ?? new Set(), disconnectedModules ?? new Set());

  const ctx: ProjectionCtx = {
    index,
    options,
    moduleVisible,
    groupDisconnected,
    moduleDisconnected,
    descriptionByGroup,
    childBoxesByGroup,
  };
  const groupNodes = layout.groups
    .filter((box) => groupById.has(box.id))
    .map((box) => groupNode(groupById.get(box.id)!, box, ctx));
  const moduleNodes = layout.modules
    .filter((box) => moduleById.has(box.id))
    .filter((box) => moduleVisible(moduleById.get(box.id)!))
    .map((box) => moduleNode(moduleById.get(box.id)!, box, ctx));
  const symbolNodes = options?.showSymbols && !options?.snippets
    ? layout.symbols
        .filter((box) => {
          if (!box.parentId) return false;
          const parentModule = moduleById.get(box.parentId);
          return parentModule !== undefined && moduleVisible(parentModule);
        })
        .map((box) => symbolNode(box, moduleById, ctx))
    : [];

  // A module tints/outlines to match its owning group's color.
  for (const node of moduleNodes) {
    const groupId = node.parentId;
    if (!groupId) continue;
    node.data.color = groupById.get(groupId)?.color ?? colorForGroup(groupId);
  }
  for (const node of symbolNodes) {
    const module = node.parentId ? moduleById.get(node.parentId) : undefined;
    if (!module) continue;
    const groupId = module.groupId;
    node.data.color =
      (groupId ? groupById.get(groupId)?.color : undefined) ??
      colorForGroup(groupId ?? module.id);
  }

  // Parents must precede children in React Flow's node array.
  const nodes: RFNode[] = [
    ...sortByDepth(groupNodes, index),
    ...moduleNodes,
    ...symbolNodes,
  ];
  return { nodes, edges: graph.edges.map((e) => edge(e, moduleById)) };
}

/** Shared projection state passed to the per-node builders (keeps arity ≤ 3). */
interface ProjectionCtx {
  index: BoxIndex;
  options?: RenderOptions;
  moduleVisible: (m: ModuleNode) => boolean;
  groupDisconnected: (groupId: string) => boolean;
  moduleDisconnected: (moduleId: string) => boolean;
  descriptionByGroup: Map<string | null, LayoutBox>;
  childBoxesByGroup: Map<string | null, LayoutBox[]>;
}

function byParentId(boxes: LayoutBox[]): Map<string | null, LayoutBox[]> {
  const map = new Map<string | null, LayoutBox[]>();
  for (const box of boxes) {
    const list = map.get(box.parentId) ?? [];
    list.push(box);
    map.set(box.parentId, list);
  }
  return map;
}

function relativePosition(box: LayoutBox, index: BoxIndex) {
  const parent = box.parentId ? index.get(box.parentId) : undefined;
  if (!parent) return { x: box.x, y: box.y };
  return { x: box.x - parent.x, y: box.y - parent.y };
}

function groupNode(
  group: GroupNode,
  box: LayoutBox,
  ctx: ProjectionCtx,
): GroupRFNode {
  const childBoxes = ctx.childBoxesByGroup.get(group.id) ?? [];
  // Description is left-aligned in CollapsedCard with a padding of 16px.
  // Constrained to DESC_BOX.maxWidth, plus another 16px buffer to the right.
  const descriptionWidth = 16 + DESC_BOX.maxWidth + 16;
  const overlappingChildren = childBoxes.filter((c) => c.x - box.x < descriptionWidth);
  const relativeYs = overlappingChildren.map((c) => c.y - box.y);
  const minChildY = relativeYs.length > 0 ? Math.min(...relativeYs) : undefined;

  return {
    id: group.id,
    type: "group",
    position: relativePosition(box, ctx.index),
    width: box.width,
    height: box.height,
    ...(group.parentId ? { parentId: group.parentId } : {}),
    data: {
      label: group.label,
      color: group.color ?? colorForGroup(group.id),
      icon: group.annotation?.icon,
      descriptionShort: group.annotation?.descriptionShort,
      descriptionLong: group.annotation?.descriptionLong,
      architectureDoc: group.architectureDoc,
      architectureDocContent: ctx.options?.groupDocs?.get(group.id),
      collapsed: ctx.options?.collapsedGroupIds?.has(group.id) ?? false,
      disconnected: ctx.groupDisconnected(group.id),
      showLong: ctx.options?.showSymbols ?? false,
      descriptionBox: descriptionBoxGeometry(group.id, box, ctx),
      minChildY,
      ...heatFields(ctx.options?.heat?.groups.get(group.id), ctx.options?.heat?.mode),
      ...heatmapSessionFields(ctx),
    },
  };
}

function heatFields(
  heat: { score: number; visible: boolean } | undefined,
  mode: "activity" | "risk" | undefined,
) {
  if (mode === undefined) return {};
  return { heatScore: heat?.score ?? 0, heatVisible: true, heatMode: mode };
}

function heatmapSessionFields(ctx: ProjectionCtx) {
  return ctx.options?.heat ? { heatmapActive: true as const } : {};
}

/** Parent-relative geometry of a group's reserved description box, pulled up to
 *  the highest position in its column that stays clear of every other child box.
 *  ELK vertically centers a short column under the header; rather than blindly
 *  pinning to the top (which can collide with a module ELK placed up there), we
 *  raise the box only until a sibling that shares its x-span blocks the way. */
function descriptionBoxGeometry(groupId: string, groupBox: LayoutBox, ctx: ProjectionCtx) {
  const box = ctx.descriptionByGroup.get(groupId);
  if (!box) return undefined;
  const y = freeTopFor(box, ctx.childBoxesByGroup.get(groupId) ?? [], groupBox);
  return { x: box.x - groupBox.x, y: y - groupBox.y, width: box.width, height: box.height };
}

const DESC_GAP = 8;

/** Highest absolute `y` the description box can sit at without overlapping a
 *  horizontally-overlapping sibling above it; floored at the group content top. */
function freeTopFor(box: LayoutBox, siblings: LayoutBox[], groupBox: LayoutBox): number {
  let top = groupBox.y + PRESETS.groupPadding + PRESETS.groupHeaderHeight;
  for (const s of siblings) {
    if (s.id === box.id) continue;
    const xOverlaps = s.x < box.x + box.width && box.x < s.x + s.width;
    if (!xOverlaps || s.y >= box.y) continue; // not blocking, or not above the box
    top = Math.max(top, s.y + s.height + DESC_GAP);
  }
  return Math.min(box.y, top); // only ever move up, never below the reserved slot
}

function moduleNode(
  module: ModuleNode,
  box: LayoutBox,
  ctx: ProjectionCtx,
): ModuleRFNode {
  const showSymbols = ctx.options?.showSymbols ?? false;
  return {
    id: module.id,
    type: "module",
    position: relativePosition(box, ctx.index),
    width: box.width,
    height: box.height,
    style: { width: box.width, height: box.height },
    ...(module.groupId ? { parentId: module.groupId } : {}),
    data: {
      label: module.label,
      isFacade: module.isFacade,
      language: module.language,
      icon: module.annotation?.icon,
      descriptionShort: module.annotation?.descriptionShort,
      descriptionLong: module.annotation?.descriptionLong,
      showSymbols,
      snippet: ctx.options?.snippets?.get(module.id),
      path: module.path,
      disconnected: ctx.moduleDisconnected(module.id),
      ...heatFields(ctx.options?.heat?.modules.get(module.id), ctx.options?.heat?.mode),
      ...heatmapSessionFields(ctx),
    },
  };
}

function symbolNode(
  box: LayoutBox,
  moduleById: Map<string, ModuleNode>,
  _ctx: ProjectionCtx,
): SymbolRFNode {
  const moduleId = box.parentId;
  const module = moduleId ? moduleById.get(moduleId) : undefined;
  if (!moduleId || !module) {
    throw new Error(`symbol ${box.id} has no parent module`);
  }
  const label = symbolNameFromId(box.id);
  const parentHeat = _ctx.options?.heat?.modules.get(moduleId);
  const mode = _ctx.options?.heat?.mode;
  return {
    id: box.id,
    type: "symbol",
    position: relativePosition(box, _ctx.index),
    width: box.width,
    height: box.height,
    style: { width: box.width, height: box.height },
    parentId: moduleId,
    extent: "parent",
    data: {
      label,
      kind: inferSymbolKind(label, module.language),
      ...heatFields(parentHeat, mode),
      ...heatmapSessionFields(_ctx),
    },
  };
}

function edge(e: Edge, moduleById: Map<string, ModuleNode>): RFEdgeT {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "default",
    data: { isViolation: e.isViolation, kind: e.kind, ...groupTarget(e, moduleById) },
  };
}

/** Idea 2: an external import of a facade anchors on the group border, not the box. */
function groupTarget(e: Edge, moduleById: Map<string, ModuleNode>) {
  const target = moduleById.get(e.target);
  if (!target?.isFacade || !target.groupId) return {};
  const source = moduleById.get(e.source);
  if (source?.groupId === target.groupId) return {}; // internal edge: keep box anchor
  return { groupTargetId: target.groupId };
}

function depth(box: LayoutBox, index: BoxIndex): number {
  let d = 0;
  let cur = box.parentId ? index.get(box.parentId) : undefined;
  while (cur) {
    d += 1;
    cur = cur.parentId ? index.get(cur.parentId) : undefined;
  }
  return d;
}

function sortByDepth(nodes: GroupRFNode[], index: BoxIndex): GroupRFNode[] {
  return [...nodes].sort(
    (a, b) => depth(index.get(a.id)!, index) - depth(index.get(b.id)!, index),
  );
}
