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
}

/** Data carried by an import edge. */
export interface EdgeData extends Record<string, unknown> {
  isViolation: boolean;
  kind: string;
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
