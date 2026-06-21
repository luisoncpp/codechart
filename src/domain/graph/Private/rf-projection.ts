import type { LayoutBox, LayoutedGraph } from "../../layout";
import { symbolNameFromId } from "./symbol-id";
import { inferSymbolKind } from "./symbol-kind";
import type { ProjectGraph } from "../ProjectGraph";
import type { GroupNode } from "../GroupNode";
import type { ModuleNode } from "../ModuleNode";
import type { Edge } from "../Edge";
import { groupParentMap, isModuleExpanded } from "./zoom-projection";
import type {
  GroupRFNode,
  ModuleRFNode,
  SymbolRFNode,
  ProjectedGraph,
  RFEdgeT,
  RFNode,
} from "./node-data";
import { colorForGroup } from "./colors";

type BoxIndex = Map<string, LayoutBox>;

/** Per-render overlay state (semantic zoom): which groups are collapsed and the
 *  lazily-fetched source snippets to show in module boxes at L2. */
export interface RenderOptions {
  collapsedGroupIds?: Set<string>;
  /** When true, symbol child boxes are emitted (L1.5+). */
  showSymbols?: boolean;
  /** moduleId → source; presence (at L2) turns on the in-box snippet. */
  snippets?: Map<string, string>;
}

/** Project a `ProjectGraph` + its layout into React Flow nodes/edges (pure). */
export function projectGraph(
  graph: ProjectGraph,
  layout: LayoutedGraph,
  options?: RenderOptions,
): ProjectedGraph {
  const index: BoxIndex = new Map();
  for (const box of [...layout.groups, ...layout.modules, ...layout.symbols]) {
    index.set(box.id, box);
  }
  const groupById = new Map(graph.groups.map((g) => [g.id, g]));
  const moduleById = new Map(graph.modules.map((m) => [m.id, m]));
  const collapsed = options?.collapsedGroupIds;
  const parentOf = groupParentMap(graph);
  const moduleVisible = (m: ModuleNode) =>
    !collapsed?.size || isModuleExpanded(m.groupId, collapsed, parentOf);

  const ctx: ProjectionCtx = { index, options, moduleVisible };
  const groupNodes = layout.groups
    .filter((box) => groupById.has(box.id))
    .map((box) => groupNode(groupById.get(box.id)!, box, ctx));
  const moduleNodes = layout.modules
    .filter((box) => moduleById.has(box.id))
    .filter((box) => moduleVisible(moduleById.get(box.id)!))
    .map((box) => moduleNode(moduleById.get(box.id)!, box, ctx));
  const symbolNodes = options?.showSymbols
    ? layout.symbols
        .filter((box) => !box.parentId || moduleVisible(moduleById.get(box.parentId)!))
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
      collapsed: ctx.options?.collapsedGroupIds?.has(group.id) ?? false,
    },
  };
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
      showSymbols,
      snippet: ctx.options?.snippets?.get(module.id),
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
