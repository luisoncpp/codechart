// @Architecture(descriptionShort="Per-document row constants shared by every code row of one rendered file")

/**
 * Values identical for every row in the document: built once by `DiffCodeLines`
 * and passed down whole, so the next document-level knob adds one field here
 * instead of a prop on each layer. Anything that varies per row (tokens, wiki
 * links, the active line, match ranges) stays a row prop.
 */
export interface RowChrome {
  zoom: number;
  /** Class-name prefix of the host (`diff-code` on L2 cards, `symbol-widget` in frames). */
  prefix: string;
  /** Module path of the rendered file; wiki links resolve relative to it. */
  path: string;
  /** Digits of the widest line number, so every gutter cell reserves one width. */
  numberDigits: number;
  /** Markdown has no comment syntax, so every token there can hold a wiki link. */
  linkEveryToken: boolean;
  /** Soft-wrap long rows instead of scrolling sideways (preview frames). */
  wrapLines?: boolean;
}
