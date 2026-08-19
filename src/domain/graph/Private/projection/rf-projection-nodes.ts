import { type LayoutBox } from "../../../layout";
import type { GroupNode } from "../../model/GroupNode";
import type { ModuleNode } from "../../model/ModuleNode";
import { colorForGroup } from "./colors";
import type { GroupRFNode, ModuleRFNode } from "./node-data";
import { descriptionBoxGeometry } from "./rf-projection-desc-box";
import { heatFields, heatmapSessionFields } from "./rf-projection-heat";
import { relativePosition } from "./rf-projection-layout";
import type { ProjectionCtx } from "./rf-projection-types";

export function groupNode(
  group: GroupNode,
  box: LayoutBox,
  ctx: ProjectionCtx,
): GroupRFNode {
  const childBoxes = visibleChildBoxes(group.id, ctx);

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
      minChildY: minChildOffset(childBoxes, box, "y"),
      minChildX: minChildOffset(childBoxes, box, "x"),
      childObstacles: relativeChildObstacles(childBoxes, box),
      loc: ctx.options?.locTotals?.get(group.id),
      ...heatFields(ctx.options?.heat?.groups.get(group.id), ctx.options?.heat?.mode),
      ...heatmapSessionFields(ctx),
    },
  };
}

function relativeChildObstacles(children: LayoutBox[], parent: LayoutBox) {
  return children.map((child) => ({
    x: child.x - parent.x,
    y: child.y - parent.y,
    width: child.width,
    height: child.height,
  }));
}

/** Child boxes the canvas will actually draw inside this group. A collapsed
 *  group's module boxes still exist in the layout (L0 layouts the full graph;
 *  collapse is projection-only) but are hidden — they must not clamp the
 *  collapsed card's description. Nested subgroup boxes stay visible. */
function visibleChildBoxes(groupId: string, ctx: ProjectionCtx): LayoutBox[] {
  const children = ctx.childBoxesByGroup.get(groupId) ?? [];
  const collapsed = ctx.options?.collapsedGroupIds?.has(groupId) ?? false;
  if (!collapsed) return children;
  return children.filter((c) => !ctx.moduleBoxIds.has(c.id));
}

/** Smallest parent-relative offset among child boxes along one axis. */
function minChildOffset(
  children: LayoutBox[],
  box: LayoutBox,
  axis: "x" | "y",
): number | undefined {
  if (children.length === 0) return undefined;
  return Math.min(...children.map((c) => c[axis] - box[axis]));
}

export function moduleNode(
  module: ModuleNode,
  box: LayoutBox,
  ctx: ProjectionCtx,
): ModuleRFNode {
  const showSymbols = ctx.options?.showSymbols ?? false;
  const symbols = ctx.moduleSymbols.get(module.id);
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
      symbols: showSymbols && symbols?.length ? symbols : undefined,
      snippet: ctx.options?.snippets?.get(module.id),
      path: module.path,
      disconnected: ctx.moduleDisconnected(module.id),
      loc: ctx.options?.locTotals ? module.metrics.loc : undefined,
      ...heatFields(ctx.options?.heat?.modules.get(module.id), ctx.options?.heat?.mode),
      ...heatmapSessionFields(ctx),
    },
  };
}
