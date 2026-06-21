import type { Node, Edge as RFEdge } from "@xyflow/react";
import type { Language } from "../Language";

/** Data carried by a custom group container node. */
export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  color: string;
  icon?: string;
}

/** Data carried by a custom module node. */
export interface ModuleNodeData extends Record<string, unknown> {
  label: string;
  isFacade: boolean;
  language: Language;
  icon?: string;
  /** Color of the owning group, so the box tints/outlines to match it. */
  color?: string;
}

/** Data carried by an import edge. */
export interface EdgeData extends Record<string, unknown> {
  isViolation: boolean;
  kind: string;
  /**
   * When set, the edge enters a facade from outside its group, so the canvas
   * anchors its arrow on this group's border instead of the facade box (Idea 2).
   */
  groupTargetId?: string;
}

export type GroupRFNode = Node<GroupNodeData, "group">;
export type ModuleRFNode = Node<ModuleNodeData, "module">;
export type RFNode = GroupRFNode | ModuleRFNode;
export type RFEdgeT = RFEdge<EdgeData>;

/** A `ProjectGraph` + layout projected into React Flow models. */
export interface ProjectedGraph {
  nodes: RFNode[];
  edges: RFEdgeT[];
}
