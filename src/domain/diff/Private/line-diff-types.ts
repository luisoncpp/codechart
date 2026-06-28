// @Architecture(descriptionShort="Line-level diff types and unchanged-module opacity constant")
/** One parsed file section from a unified diff. */
export interface FileLineDiff {
  /** New-file line numbers (1-indexed) that were added. */
  addedLineNumbers: ReadonlySet<number>;
  /** Red rows to insert immediately before a new-file line number. */
  removeBeforeLine: ReadonlyMap<number, readonly string[]>;
}

export type DiffDisplayRow =
  | { kind: "context"; lineNumber: number; text: string }
  | { kind: "add"; lineNumber: number; text: string }
  | { kind: "remove"; text: string };

/** Opacity for modules untouched by the active diff overlay. */
export const UNCHANGED_MODULE_DIFF_OPACITY = 0.4;
