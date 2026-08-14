export type { GraphDiffOverlay, ParsedDiffPaths } from "./Private/types";
export type { FileLineDiff, DiffDisplayRow } from "./Private/line-diff-types";
export { UNCHANGED_MODULE_DIFF_OPACITY } from "./Private/line-diff-types";
export { compareGraphs } from "./Private/compare-graphs";
export { pathsFromUnifiedDiff, normalizeDiffPath } from "./Private/parse-unified-diff";
export { lineDiffsFromUnified } from "./Private/parse-line-diff";
export { buildModuleDiffDisplay } from "./Private/module-diff-display";
export { countLineDiffStats, diffStatsSuffixLength } from "./Private/line-diff-stats";
export type { LineDiffStats } from "./Private/line-diff-stats";
export { overlayFromPastedDiff } from "./Private/overlay-from-paths";
export { applyDiffOverlay } from "./Private/apply-diff-overlay";
export { withDiffReview } from "./Private/apply-diff-review";
export { attachLineDiff } from "./Private/attach-line-diff";
export { attachRenames } from "./Private/attach-renames";
export { mergeCommitOverlay } from "./Private/merge-commit-overlay";
export {
  excludeSubmoduleModules,
  underSubmoduleRoot,
} from "./Private/exclude-submodule-modules";
export { classifySymbolChanges } from "./Private/symbol-diff";
export type { SymbolChangeSets, SymbolDiffInput } from "./Private/symbol-diff";
export { attachSymbolDiff } from "./Private/attach-symbol-diff";
