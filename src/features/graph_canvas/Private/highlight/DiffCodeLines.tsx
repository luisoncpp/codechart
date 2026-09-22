import { useMemo } from "react";
import {
  buildModuleDiffDisplay,
  type DiffDisplayRow,
  type DiffNote,
  type FileLineDiff,
} from "../../../../domain/diff";
import type { Token } from "./highlighter-types";
import { LineTokenizer } from "./line-tokenizer";
import type { LineMatchRange } from "./match-highlight";
import { DiffRowItem } from "./DiffRowItem";
import type { RowChrome } from "./row-chrome";
import { findWikiLinks, isMarkdownPath, type WikiLinkSpan } from "../wiki_links";
import { useReviewNotesStore } from "../../../review_notes";

interface DiffCodeLinesProps {
  source: string;
  path: string;
  fileDiff?: FileLineDiff;
  diffNotes?: readonly DiffNote[];
  zoom?: number;
  lineClassPrefix?: string;
  /** Soft-wrap long rows instead of scrolling sideways (preview frames). */
  wrapLines?: boolean;
  activeLine?: number;
  activeLineRef?: React.RefObject<HTMLDivElement | null>;
  /** Identifiers to render as clickable (`hl-clickable`) navigation targets. */
  clickableNames?: ReadonlySet<string>;
  /** Find-in-frame match ranges keyed by 1-based line number. */
  matchesByLine?: ReadonlyMap<number, readonly LineMatchRange[]>;
  /** Attached to the currently active find-in-frame match span. */
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

/** Code lines with optional unified-diff +/- green/red row styling. */
export function DiffCodeLines(props: DiffCodeLinesProps) {
  const { source, path, fileDiff, diffNotes } = props;
  const reviewNotes = useReviewNotesStore();
  const notes = reviewNotes?.notesFor(path) ?? [];
  const draft = reviewNotes?.getDraft();
  const rows = useMemo(() => buildModuleDiffDisplay(source, fileDiff), [source, fileDiff]);
  const tokenized = useMemo(() => tokenizeRows(rows, path), [rows, path]);
  const wikiLinks = useMemo(() => wikiLinksPerRow(rows), [rows]);
  const numberDigits = useMemo(() => gutterDigits(rows), [rows]);
  const chrome = rowChrome(props, numberDigits);
  const onLineClick = reviewNotes
    ? /*start or extend a Review Note draft*/ (line: number, extend: boolean) =>
        selectReviewLine(reviewNotes, source, path, line, extend)
    : undefined;
  return (
    <>
      {rows.map((row, idx) => (
        <DiffRowItem
          key={idx} row={row} tokens={tokenized[idx]!} links={wikiLinks[idx]!}
          chrome={chrome} clickableNames={props.clickableNames}
          activeLine={props.activeLine} activeLineRef={props.activeLineRef}
          matchesByLine={props.matchesByLine} activeMatchRef={props.activeMatchRef}
          notes={notes} draft={draft} diffNotes={diffNotes}
          onLineClick={onLineClick}
        />
      ))}
    </>
  );
}

/** The values every row of this document shares, built once per render. */
function rowChrome(props: DiffCodeLinesProps, numberDigits: number): RowChrome {
  return {
    zoom: props.zoom ?? 1,
    prefix: props.lineClassPrefix ?? "diff-code",
    path: props.path,
    numberDigits,
    // Code only links inside comments (a literal `[[a,b]]` in source is not a
    // link); markdown has no comment syntax, so every token can hold one.
    linkEveryToken: isMarkdownPath(props.path),
    wrapLines: props.wrapLines,
  };
}

/** Digits of the widest number in the gutter (`remove` rows count too). */
function gutterDigits(rows: readonly DiffDisplayRow[]): number {
  let widest = 1;
  for (const row of rows) widest = Math.max(widest, row.lineNumber);
  return String(widest).length;
}

/** One tokenizer for the whole document so block comments span rows. */
function tokenizeRows(rows: readonly DiffDisplayRow[], path: string): Token[][] {
  const tokenizer = new LineTokenizer(path);
  return rows.map((row) =>
    row.kind === "remove" || row.kind === "move-remove"
      ? [{ type: "plain", text: row.text }]
      : tokenizer.tokenizeLine(row.text),
  );
}

/** `remove` rows come from the before-snapshot; their links are not navigable. */
function wikiLinksPerRow(rows: readonly DiffDisplayRow[]): WikiLinkSpan[][] {
  return rows.map((row) => (row.kind === "remove" || row.kind === "move-remove" ? [] : findWikiLinks(row.text)));
}

function selectReviewLine(store: NonNullable<ReturnType<typeof useReviewNotesStore>>, source: string, path: string, line: number, extend: boolean) {
  const current = store.getDraft();
  const start = extend && current?.path === path ? Math.min(current.startLine, line) : line;
  const end = extend && current?.path === path ? Math.max(current.startLine, line) : line;
  const lines = source.split("\n").slice(start - 1, end);
  store.beginDraft({ path, startLine: start, endLine: end, anchorLines: lines });
}
