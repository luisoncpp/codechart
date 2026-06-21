import type { ProjectGraph } from "../../graph";

/** An absolutely-positioned box for one group or module. */
export interface LayoutBox {
  id: string;
  parentId: string | null;
  /** Absolute top-left in layout space. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Result of laying out a `ProjectGraph`: boxes in absolute coordinates. */
export interface LayoutedGraph {
  groups: LayoutBox[];
  modules: LayoutBox[];
  /** Overall diagram bounds. */
  width: number;
  height: number;
}

/** Optional sizing overrides (e.g. larger module boxes for L2 code snippets). */
export interface LayoutOptions {
  moduleWidth?: number;
  moduleHeight?: number;
  /**
   * Per-group footprint to reuse when a group is collapsed (childless), keyed by
   * group id. Lets a collapsed group keep its expanded size instead of shrinking
   * to a generic card. Captured from the full (uncollapsed) layout.
   */
  collapsedGroupSizes?: Map<string, { width: number; height: number }>;
}

export interface LayoutEngine {
  layout(graph: ProjectGraph, options?: LayoutOptions): Promise<LayoutedGraph>;
}
