// @Architecture(descriptionShort="Greedy placement for deleted ghost modules to prevent overlap")
import type { GroupNodeData, ModuleNode, RFNode } from "../../graph";
import type { LayoutBox, LayoutedGraph } from "../../layout";
import { MODULE_BOX, moduleBoxSize } from "../../layout";
import type { GraphDiffOverlay } from "./types";
import {
  pickBestPosition,
  type ContainerBounds,
  type Obstacle,
} from "./ghost-placement-score";

interface PlacementContext {
  overlay: GraphDiffOverlay;
  showSymbols: boolean;
  existingGroupIds: Set<string>;
  layoutById: Map<string, LayoutBox>;
  index: Map<string, LayoutBox>;
}

/** Places ghost modules using greedy overlap avoidance. */
export function placeGhostModules(
  overlay: GraphDiffOverlay,
  showSymbols: boolean,
  stampedNodes: readonly RFNode[] = [],
): RFNode[] {
  if (overlay.ghostModules.length === 0) return [];
  const ctx: PlacementContext = {
    overlay,
    showSymbols,
    existingGroupIds: new Set(
      stampedNodes.filter((n) => n.type === "group").map((n) => n.id),
    ),
    layoutById: new Map((overlay.beforeLayout?.modules ?? []).map((b) => [b.id, b])),
    index: buildBoxIndex(overlay.beforeLayout),
  };
  const containers = new Map<string, { obstacles: Obstacle[]; bounds: ContainerBounds }>();

  return overlay.ghostModules.flatMap((mod) =>
    placeSingleGhost(mod, ctx, stampedNodes, containers),
  );
}

function placeSingleGhost(
  mod: ModuleNode,
  ctx: PlacementContext,
  stampedNodes: readonly RFNode[],
  containers: Map<string, { obstacles: Obstacle[]; bounds: ContainerBounds }>,
): RFNode[] {
  const hasValidParent = !!mod.groupId && ctx.existingGroupIds.has(mod.groupId);
  const parentId = hasValidParent ? mod.groupId! : undefined;
  const containerKey = parentId ?? "__root__";

  if (!containers.has(containerKey)) {
    containers.set(containerKey, containerObstacles(parentId, stampedNodes));
  }
  const container = containers.get(containerKey)!;
  const box = ctx.layoutById.get(mod.id);
  const size = box ? { width: box.width, height: box.height } : moduleBoxSize(mod.label);
  const initialPos = box
    ? (hasValidParent ? relativePosition(box, ctx.index) : { x: box.x, y: box.y })
    : undefined;

  const position = pickBestPosition(size, container.obstacles, container.bounds, initialPos);
  container.obstacles.push({ ...position, ...size, kind: "diff" });
  return [buildGhostNode(mod, position, size, parentId, ctx)];
}

function containerObstacles(
  containerId: string | undefined,
  stampedNodes: readonly RFNode[],
): { obstacles: Obstacle[]; bounds: ContainerBounds } {
  const obstacles: Obstacle[] = [];
  let bounds: ContainerBounds = { width: 600, height: 400 };

  if (containerId) {
    const group = stampedNodes.find((n) => n.id === containerId && n.type === "group");
    if (group) {
      bounds = { width: group.width ?? 600, height: group.height ?? 400 };
      obstacles.push(...groupObstacles(group, bounds.width));
    }
  }

  for (const n of stampedNodes) {
    const inContainer = containerId ? n.parentId === containerId : !n.parentId;
    if (!inContainer || n.id === containerId) continue;
    const width = n.width ?? (n.style?.width as number) ?? MODULE_BOX.minWidth;
    const height = n.height ?? (n.style?.height as number) ?? MODULE_BOX.minHeight;
    obstacles.push({ x: n.position.x, y: n.position.y, width, height, kind: obstacleKind(n) });
  }

  return { obstacles, bounds };
}

function groupObstacles(group: RFNode, groupWidth: number): Obstacle[] {
  const list: Obstacle[] = [{ x: 0, y: 0, width: groupWidth, height: 35, kind: "group" }];
  const desc = (group.data as GroupNodeData).descriptionBox;
  if (desc) {
    list.push({ x: desc.x, y: desc.y, width: desc.width, height: desc.height, kind: "group" });
  }
  return list;
}

function obstacleKind(node: RFNode): Obstacle["kind"] {
  if (node.type === "group") return "group";
  if (node.data.diffState === "affected" || node.data.diffState === "deleted") return "diff";
  return "previous";
}

function buildGhostNode(
  mod: ModuleNode,
  position: { x: number; y: number },
  size: { width: number; height: number },
  parentId: string | undefined,
  ctx: PlacementContext,
): RFNode {
  return {
    id: mod.id,
    type: "module" as const,
    position,
    data: {
      label: mod.label,
      isFacade: mod.isFacade,
      language: mod.language,
      path: mod.path,
      showSymbols: ctx.showSymbols,
      color: "#64748b",
      diffState: "deleted" as const,
      ...(ctx.overlay.lineDiffByPath.get(mod.path)
        ? { diffLineDiff: ctx.overlay.lineDiffByPath.get(mod.path) }
        : {}),
    },
    style: { width: size.width, height: size.height },
    width: size.width,
    height: size.height,
    ...(parentId ? { parentId } : {}),
  };
}

function buildBoxIndex(layout: LayoutedGraph | null) {
  if (!layout) return new Map<string, LayoutBox>();
  return new Map(
    [...layout.groups, ...layout.modules, ...layout.symbols, ...layout.descriptions].map(
      (b) => [b.id, b],
    ),
  );
}

function relativePosition(box: LayoutBox, index: Map<string, LayoutBox>) {
  if (!box.parentId) return { x: box.x, y: box.y };
  const parent = index.get(box.parentId);
  if (!parent) return { x: box.x, y: box.y };
  return { x: box.x - parent.x, y: box.y - parent.y };
}
