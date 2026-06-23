// @Architecture(descriptionShort="TypeScript interfaces and types for projection nodes")
import type { Node, Edge as RFEdge } from "@xyflow/react";
import type { Language } from "../Language";
import type { SymbolKind } from "./symbol-kind";

/** Data carried by a custom group container node. */
export interface GroupNodeData extends Record<string, unknown> {
  label: string;
  color: string;
  icon?: string;
  /** Annotation one-liner shown under the header (Phase 10 metadata). */
  descriptionShort?: string;
  /** Full annotation prose; preferred over the short one at L0 / L1.5+ when it fits. */
  descriptionLong?: string;
  /** True when this group is rendered collapsed (semantic zoom). */
  collapsed?: boolean;
  /** True at L1.5+ (symbols visible): the in-group description shows the long text. */
  showLong?: boolean;
  /** Geometry (parent-relative) of the layout-reserved in-body description box, so
   *  the view draws the prose there and modules pack around it (expanded only). */
  descriptionBox?: { x: number; y: number; width: number; height: number };
  /** Parent-relative y coordinate of the top-most subgroup or child box. */
  minChildY?: number;
}

/** Data carried by a custom module node. */
export interface ModuleNodeData extends Record<string, unknown> {
  label: string;
  isFacade: boolean;
  language: Language;
  icon?: string;
  /** Color of the owning group, so the box tints/outlines to match it. */
  color?: string;
  /** Annotation one-liner (Phase 10 metadata). */
  descriptionShort?: string;
  /** Detailed annotation prose (Phase 10 metadata). */
  descriptionLong?: string;
  /** True when symbol child boxes are visible (L1.5+). */
  showSymbols?: boolean;
  /** Source snippet shown in-box at L2 (lazily fetched). */
  snippet?: string;
  /** Relative source file path of the module. */
  path?: string;
}

/** Data carried by an exported-symbol box nested under a module. */
export interface SymbolNodeData extends Record<string, unknown> {
  label: string;
  kind: SymbolKind;
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
export type SymbolRFNode = Node<SymbolNodeData, "symbol">;
export type RFNode = GroupRFNode | ModuleRFNode | SymbolRFNode;
export type RFEdgeT = RFEdge<EdgeData>;

/** A `ProjectGraph` + layout projected into React Flow models. */
export interface ProjectedGraph {
  nodes: RFNode[];
  edges: RFEdgeT[];
}
