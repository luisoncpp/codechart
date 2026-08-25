// @Architecture(descriptionShort="Line-level diff types, moved line locations, and display rows")
/** Location of a moved line in another file. */
export interface MovedLocation {
  path: string;
  line: number;
}

/** One parsed file section from a unified diff. */
export interface FileLineDiff {
  /** New-file line numbers (1-indexed) that were added. */
  addedLineNumbers: ReadonlySet<number>;
  /** Added line text per new-file line number (1-indexed). */
  addedLineTexts?: ReadonlyMap<number, string>;
  /** Old-file line numbers (1-indexed) that were removed. */
  removedLineNumbers?: ReadonlySet<number>;
  /** Red rows to insert immediately before a new-file line number. */
  removeBeforeLine: ReadonlyMap<number, readonly string[]>;
  /** Detail of removed lines with old line number and text. */
  removedLineDetails?: ReadonlyArray<{ oldLine: number; text: string }>;
  /** Line numbers in this new file that were moved from another file. */
  movedAddedLines?: ReadonlyMap<number, MovedLocation>;
  /** Line numbers in this old file that were moved to another file. */
  movedRemovedLines?: ReadonlyMap<number, MovedLocation>;
}

export type DiffDisplayRow =
  | { kind: "context"; lineNumber: number; text: string; tooltip?: string }
  | { kind: "add"; lineNumber: number; text: string; tooltip?: string }
  | { kind: "remove"; lineNumber: number; text: string; tooltip?: string }
  | { kind: "move-add"; lineNumber: number; text: string; movedFrom: MovedLocation; tooltip: string }
  | { kind: "move-remove"; lineNumber: number; text: string; movedTo: MovedLocation; tooltip: string };

/** Opacity for modules untouched by the active diff overlay. */
export const UNCHANGED_MODULE_DIFF_OPACITY = 0.4;

