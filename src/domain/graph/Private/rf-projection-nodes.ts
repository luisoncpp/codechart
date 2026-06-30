import type { LayoutBox } from "../../layout/Private/layout-types";
import { DESC_BOX } from "../../layout/Private/module-box-metrics";
import { symbolNameFromId } from "../symbol-id";
import type { GroupNode } from "../GroupNode";
import type { ModuleNode } from "../ModuleNode";
import { inferSymbolKind } from "./symbol-kind";
import { colorForGroup } from "./colors";
import type { GroupRFNode, ModuleRFNode, SymbolRFNode } from "./node-data";
import { descriptionBoxGeometry } from "./rf-projection-desc-box";
import { heatFields, heatmapSessionFields } from "./rf-projection-heat";
import { relativePosition } from "./rf-projection-layout";
import type { ProjectionCtx } from "./rf-projection-types";

export function groupNode(
  group: GroupNode,
  box: LayoutBox,
  ctx: ProjectionCtx,
): GroupRFNode {
  const childBoxes = ctx.childBoxesByGroup.get(group.id) ?? [];
  const minChildY = minChildYForGroup(box, childBoxes);

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

/** Lowest relative Y among child boxes that overlap the description column. */
function minChildYForGroup(box: LayoutBox, childBoxes: LayoutBox[]) {
  const descriptionWidth = 16 + DESC_BOX.maxWidth + 16;
  const overlappingChildren = childBoxes.filter((c) => c.x - box.x < descriptionWidth);
  const relativeYs = overlappingChildren.map((c) => c.y - box.y);
  return relativeYs.length > 0 ? Math.min(...relativeYs) : undefined;
}

export function moduleNode(
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

export function symbolNode(
  box: LayoutBox,
  moduleById: Map<string, ModuleNode>,
  ctx: ProjectionCtx,
): SymbolRFNode {
  const moduleId = box.parentId;
  const module = moduleId ? moduleById.get(moduleId) : undefined;
  if (!moduleId || !module) {
    throw new Error(`symbol ${box.id} has no parent module`);
  }
  const label = symbolNameFromId(box.id);
  const parentHeat = ctx.options?.heat?.modules.get(moduleId);
  const mode = ctx.options?.heat?.mode;
  return {
    id: box.id,
    type: "symbol",
    position: relativePosition(box, ctx.index),
    width: box.width,
    height: box.height,
    style: { width: box.width, height: box.height },
    parentId: moduleId,
    extent: "parent",
    data: {
      label,
      kind: inferSymbolKind(label, module.language),
      ...heatFields(parentHeat, mode),
      ...heatmapSessionFields(ctx),
    },
  };
}
