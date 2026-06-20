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

export interface LayoutEngine {
  layout(graph: ProjectGraph): Promise<LayoutedGraph>;
}
