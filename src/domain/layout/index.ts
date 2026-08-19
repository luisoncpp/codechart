export type {
  LayoutEngine,
  LayoutedGraph,
  LayoutBox,
  LayoutOptions,
} from "./Private/layout-types";
export { ElkLayoutEngine } from "./Private/elk-layout-engine";
export {
  fitDescriptionFontSize,
  fitLabelFontSize,
  labelCharsPerLine,
  MODULE_BOX,
  DESC_BOX,
  wrappedDescriptionHeight,
  moduleBoxSize,
} from "./Private/module-box-metrics";
export { fitModuleHeaderFontSize } from "./Private/fit-module-header-font";
export { expandedHeaderScale } from "./Private/group-header-metrics";
export { wrapIdentifierLines } from "./Private/wrap-identifier";
export { PRESETS } from "./Private/layout-presets";
export { symbolsFitOnScreen } from "./Private/symbol-box-metrics";
