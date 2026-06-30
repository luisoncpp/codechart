import type { Edge } from "../Edge";
import type { ModuleNode } from "../ModuleNode";
import type { RFEdgeT } from "./node-data";

export function projectEdge(e: Edge, moduleById: Map<string, ModuleNode>): RFEdgeT {
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
