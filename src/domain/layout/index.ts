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
} from "./Private/module-box-metrics";
export { fitModuleHeaderFontSize } from "./Private/fit-module-header-font";
export { wrapIdentifierLines } from "./Private/wrap-identifier";
export { PRESETS } from "./Private/layout-presets";
