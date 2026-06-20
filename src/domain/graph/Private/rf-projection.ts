import type { LayoutBox, LayoutedGraph } from "../../layout";
import type { ProjectGraph } from "../ProjectGraph";
import type { GroupNode } from "../GroupNode";
import type { ModuleNode } from "../ModuleNode";
import type { Edge } from "../Edge";
import type {
  GroupRFNode,
  ModuleRFNode,
  ProjectedGraph,
  RFEdgeT,
  RFNode,
} from "./node-data";
import { colorForGroup } from "./colors";

type BoxIndex = Map<string, LayoutBox>;

/** Project a `ProjectGraph` + its layout into React Flow nodes/edges (pure). */
export function projectGraph(
  graph: ProjectGraph,
  layout: LayoutedGraph,
): ProjectedGraph {
  const index: BoxIndex = new Map();
  for (const box of [...layout.groups, ...layout.modules]) {
    index.set(box.id, box);
  }
  const groupById = new Map(graph.groups.map((g) => [g.id, g]));
  const moduleById = new Map(graph.modules.map((m) => [m.id, m]));

  const groupNodes = layout.groups
    .filter((box) => groupById.has(box.id))
    .map((box) => groupNode(groupById.get(box.id)!, box, index));
  const moduleNodes = layout.modules
    .filter((box) => moduleById.has(box.id))
    .map((box) => moduleNode(moduleById.get(box.id)!, box, index));

  // Parents must precede children in React Flow's node array.
  const nodes: RFNode[] = [...sortByDepth(groupNodes, index), ...moduleNodes];
  return { nodes, edges: graph.edges.map(edge) };
}

function relativePosition(box: LayoutBox, index: BoxIndex) {
  const parent = box.parentId ? index.get(box.parentId) : undefined;
  if (!parent) return { x: box.x, y: box.y };
  return { x: box.x - parent.x, y: box.y - parent.y };
}

function groupNode(
  group: GroupNode,
  box: LayoutBox,
  index: BoxIndex,
): GroupRFNode {
  return {
    id: group.id,
    type: "group",
    position: relativePosition(box, index),
    width: box.width,
    height: box.height,
    ...(group.parentId ? { parentId: group.parentId } : {}),
    data: {
      label: group.label,
      color: group.color ?? colorForGroup(group.id),
      icon: group.annotation?.icon,
    },
  };
}

function moduleNode(
  module: ModuleNode,
  box: LayoutBox,
  index: BoxIndex,
): ModuleRFNode {
  return {
    id: module.id,
    type: "module",
    position: relativePosition(box, index),
    width: box.width,
    height: box.height,
    ...(module.groupId ? { parentId: module.groupId } : {}),
    data: {
      label: module.label,
      isFacade: module.isFacade,
      language: module.language,
      icon: module.annotation?.icon,
    },
  };
}

function edge(e: Edge): RFEdgeT {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "default",
    data: { isViolation: e.isViolation, kind: e.kind },
  };
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
