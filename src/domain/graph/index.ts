export type { Annotation } from "./model/Annotation";
export type { Diagnostic } from "./model/Diagnostic";
export type { DiagnosticKind } from "./model/DiagnosticKind";
export type { Edge } from "./model/Edge";
export type { EdgeKind } from "./model/EdgeKind";
export type { GroupNode } from "./model/GroupNode";
export type { Language } from "./model/Language";
export type { ModuleMetrics } from "./model/ModuleMetrics";
export type { ModuleNode } from "./model/ModuleNode";
export type { ProjectGraph } from "./model/ProjectGraph";
export type { Severity } from "./model/Severity";
export { projectGraphSummary } from "./Private/projection/graph-projector";
export { projectGraph } from "./Private/projection/rf-projection";
export type { RenderOptions } from "./Private/projection/rf-projection";
export { symbolBoxId, symbolNameFromId } from "./symbol-id";
export { inferSymbolKind } from "./Private/symbol-kind";
export type { SymbolKind } from "./Private/symbol-kind";
export { SYMBOL_KIND_DISPLAY } from "./Private/symbol-kind-display";
export {
  projectForZoom,
  isModuleExpanded,
  groupParentMap,
} from "./Private/reduction/zoom-projection";
export {
  allGroupIds,
  topLevelGroupIds,
  levelFromZoom,
  L0_ZOOM_BOUNDARY,
} from "./Private/reduction/zoom-level";
export { isTestModule, filterTestModules } from "./Private/reduction/test-modules";
export {
  isGroupDisconnected,
  isModuleDisconnected,
  filterDisconnectedEdges,
  defaultDisconnectedSets,
  countHiddenEdges,
} from "./Private/reduction/connection-filter";
export type { ZoomLevel } from "./Private/reduction/zoom-level";
export type { HeatmapMode, ModuleHeat, HeatProjection } from "./Private/heat/heat-types";
export {
  computeHeatProjection,
  rawHeatValue,
  heatBand,
  formatChurn,
} from "./Private/heat/heat-scores";
export { heatColor, heatFill, heatFillOpacity, heatLegendGradient } from "./Private/heat/heat-colors";
export type {
  ProjectedGraph,
  GroupNodeData,
  ModuleNodeData,
  SymbolNodeData,
  EdgeData,
  GroupRFNode,
  ModuleRFNode,
  SymbolRFNode,
  RFNode,
  RFEdgeT,
} from "./Private/projection/node-data";
export {
  findModule,
  findGroup,
  modulesInGroup,
  childGroupsOf,
  moduleIdsInGroupTree,
  groupImportsOf,
  groupImportedBy,
  diagnosticsForGroup,
  edgeFocusForSelection,
  groupOf,
  importsOf,
  importedBy,
  softEdgesOf,
  diagnosticsFor,
  architectureViolations,
} from "./Private/selectors";
export type { EdgeFocus } from "./Private/selectors";
