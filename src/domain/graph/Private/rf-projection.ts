// @Architecture(descriptionShort="Converts internal project graph model to React Flow projection")
import type { LayoutedGraph } from "../../layout/Private/layout-types";
import type { ProjectGraph } from "../ProjectGraph";
import type { GroupNode } from "../GroupNode";
import type { ModuleNode } from "../ModuleNode";
import { colorForGroup } from "./colors";
import { groupParentMap, isModuleExpanded } from "./zoom-projection";
import {
  isGroupDisconnected,
  isModuleDisconnected,
} from "./connection-filter";
import type { ProjectedGraph, RFNode } from "./node-data";
import { projectEdge } from "./rf-projection-edges";
import { byParentId, sortByDepth } from "./rf-projection-layout";
import { groupNode, moduleNode, symbolNode } from "./rf-projection-nodes";
import type { BoxIndex, ProjectionCtx, RenderOptions } from "./rf-projection-types";

export type { RenderOptions } from "./rf-projection-types";

/** Project a `ProjectGraph` + its layout into React Flow nodes/edges (pure). */
export function projectGraph(
  graph: ProjectGraph,
  layout: LayoutedGraph,
  options?: RenderOptions,
): ProjectedGraph {
  const layoutIndexes = buildLayoutIndexes(layout);
  const groupById = new Map(graph.groups.map((g) => [g.id, g]));
  const moduleById = new Map(graph.modules.map((m) => [m.id, m]));
  const ctx = buildProjectionCtx(graph, options, layoutIndexes);

  const groupNodes = layout.groups
    .filter((box) => groupById.has(box.id))
    .map((box) => groupNode(groupById.get(box.id)!, box, ctx));
  const moduleNodes = layout.modules
    .filter((box) => moduleById.has(box.id))
    .filter((box) => ctx.moduleVisible(moduleById.get(box.id)!))
    .map((box) => moduleNode(moduleById.get(box.id)!, box, ctx));
  const symbolNodes = buildSymbolNodes(layout, moduleById, ctx);
  tintNodesWithGroupColor(moduleNodes, symbolNodes, { groupById, moduleById });

  const nodes: RFNode[] = [
    ...sortByDepth(groupNodes, layoutIndexes.index),
    ...moduleNodes,
    ...symbolNodes,
  ];
  return { nodes, edges: graph.edges.map((e) => projectEdge(e, moduleById)) };
}

function buildLayoutIndexes(layout: LayoutedGraph) {
  const index: BoxIndex = new Map();
  for (const box of [
    ...layout.groups,
    ...layout.modules,
    ...layout.symbols,
    ...layout.descriptions,
  ]) {
    index.set(box.id, box);
  }
  return {
    index,
    descriptionByGroup: new Map(layout.descriptions.map((b) => [b.parentId, b])),
    childBoxesByGroup: byParentId([...layout.modules, ...layout.groups]),
  };
}

function buildProjectionCtx(
  graph: ProjectGraph,
  options: RenderOptions | undefined,
  layoutIndexes: ReturnType<typeof buildLayoutIndexes>,
): ProjectionCtx {
  const { index, descriptionByGroup, childBoxesByGroup } = layoutIndexes;
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
    isModuleDisconnected(
      moduleId,
      graph,
      disconnectedGroups ?? new Set(),
      disconnectedModules ?? new Set(),
    );

  return {
    index,
    options,
    moduleVisible,
    groupDisconnected,
    moduleDisconnected,
    descriptionByGroup,
    childBoxesByGroup,
  };
}

function buildSymbolNodes(
  layout: LayoutedGraph,
  moduleById: Map<string, ModuleNode>,
  ctx: ProjectionCtx,
) {
  if (!ctx.options?.showSymbols || ctx.options?.snippets) return [];
  return layout.symbols
    .filter((box) => {
      if (!box.parentId) return false;
      const parentModule = moduleById.get(box.parentId);
      return parentModule !== undefined && ctx.moduleVisible(parentModule);
    })
    .map((box) => symbolNode(box, moduleById, ctx));
}

function tintNodesWithGroupColor(
  moduleNodes: ReturnType<typeof moduleNode>[],
  symbolNodes: ReturnType<typeof symbolNode>[],
  refs: { groupById: Map<string, GroupNode>; moduleById: Map<string, ModuleNode> },
) {
  const { groupById, moduleById } = refs;
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
}
