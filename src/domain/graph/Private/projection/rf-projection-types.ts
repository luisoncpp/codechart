import type { LayoutBox } from "../../../layout";
import type { ModuleNode } from "../../model/ModuleNode";
import type { HeatProjection } from "../heat/heat-types";
import type { ModuleSymbolDescriptor } from "./node-data";

export type BoxIndex = Map<string, LayoutBox>;

/** Per-render overlay state (semantic zoom): which groups are collapsed and the
 *  lazily-fetched source snippets to show in module boxes at L2. */
export interface RenderOptions {
  collapsedGroupIds?: Set<string>;
  disconnectedGroupIds?: Set<string>;
  disconnectedModuleIds?: Set<string>;
  /** When true, exported-symbol boxes are attached to each module (L1.5+). */
  showSymbols?: boolean;
  /** moduleId → source; presence (at L2) turns on the in-box snippet. */
  snippets?: Map<string, string>;
  /** groupId → markdown; presence (at L2) turns on the architecture doc panel. */
  groupDocs?: Map<string, string>;
  /** Normalized heat scores when the heatmap overlay is enabled. */
  heat?: HeatProjection & { mode: "activity" | "risk" };
  /** groupId → LOC of its module tree (`groupLocTotals` over the **full** graph);
   *  presence turns the module/group line counters on (View ▾ → Line counts). */
  locTotals?: Map<string, number>;
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
  /** Ids of module boxes in the layout — hidden at L0, unlike subgroup boxes. */
  moduleBoxIds: Set<string>;
  /** moduleId → exported symbol descriptors when `showSymbols` is on. */
  moduleSymbols: Map<string, ModuleSymbolDescriptor[]>;
}
