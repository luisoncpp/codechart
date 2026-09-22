export { projectGraphSummary } from "./Private/rf/graph-projector";
export { projectGraph } from "./Private/rf/rf-projection";
export type { RenderOptions } from "./Private/rf/rf-projection";
export type {
  ProjectedGraph,
  GroupNodeData,
  ModuleNodeData,
  ModuleSymbolDescriptor,
  EdgeData,
  GroupRFNode,
  ModuleRFNode,
  RFNode,
  RFEdgeT,
} from "./Private/rf/node-data";
export { applyDiffOverlay } from "./Private/diff_overlay/apply-diff-overlay";
export { withDiffReview } from "./Private/diff_overlay/apply-diff-review";
