import type { LayoutBox } from "../../layout/Private/layout-types";
import type { ModuleNode } from "../ModuleNode";
import type { HeatProjection } from "./heat-types";

export type BoxIndex = Map<string, LayoutBox>;

/** Per-render overlay state (semantic zoom): which groups are collapsed and the
 *  lazily-fetched source snippets to show in module boxes at L2. */
export interface RenderOptions {
  collapsedGroupIds?: Set<string>;
  disconnectedGroupIds?: Set<string>;
  disconnectedModuleIds?: Set<string>;
  /** When true, symbol child boxes are emitted (L1.5+). */
  showSymbols?: boolean;
  /** moduleId → source; presence (at L2) turns on the in-box snippet. */
  snippets?: Map<string, string>;
  /** groupId → markdown; presence (at L2) turns on the architecture doc panel. */
  groupDocs?: Map<string, string>;
  /** Normalized heat scores when the heatmap overlay is enabled. */
  heat?: HeatProjection & { mode: "activity" | "risk" };
}

/** Shared projection state passed to the per-node builders (keeps arity ≤ 3). */
export interface ProjectionCtx {
  index: BoxIndex;
  options?: RenderOptions;
  moduleVisible: (m: ModuleNode) => boolean;
  groupDisconnected: (groupId: string) => boolean;
  moduleDisconnected: (moduleId: string) => boolean;
  descriptionByGroup: Map<string | null, LayoutBox>;
  childBoxesByGroup: Map<string | null, LayoutBox[]>;
}
