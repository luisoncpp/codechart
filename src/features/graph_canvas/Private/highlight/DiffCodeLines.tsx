import { Fragment, useMemo } from "react";
import {
  buildModuleDiffDisplay,
  type DiffDisplayRow,
  type FileLineDiff,
} from "../../../../domain/diff";
import type { Token } from "./highlighter";
import { LineTokenizer } from "./line-tokenizer";
import type { LineMatchRange } from "./match-highlight";
import { DiffCodeLine } from "./DiffCodeLine";
import { findWikiLinks, isMarkdownPath, type WikiLinkSpan } from "../wiki_links";
import { InlineReviewNotes, useReviewNotesStore } from "../../../review_notes";

interface DiffCodeLinesProps {
  source: string;
  path: string;
  fileDiff?: FileLineDiff;
  zoom?: number;
  lineClassPrefix?: string;
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
export function DiffCodeLines({
  source,
  path,
  fileDiff,
  zoom = 1,
  lineClassPrefix = "diff-code",
  activeLine,
  activeLineRef,
  clickableNames,
  matchesByLine,
  activeMatchRef,
}: DiffCodeLinesProps) {
  const reviewNotes = useReviewNotesStore();
  const notes = reviewNotes?.notesFor(path) ?? [];
  const draft = reviewNotes?.getDraft();
  const rows = useMemo(
    () => buildModuleDiffDisplay(source, fileDiff),
    [source, fileDiff],
  );
  const tokenized = useMemo(() => tokenizeRows(rows, path), [rows, path]);
  const wikiLinks = useMemo(() => wikiLinksPerRow(rows), [rows]);
  // Code only links inside comments (a literal `[[a,b]]` in source is not a
  // link); markdown has no comment syntax, so every token can hold one.
  const linkEveryToken = isMarkdownPath(path);

  return (
    <>
      {rows.map((row, idx) => {
        const showNotes = row.kind !== "remove";
        const lineNotes = showNotes ? notes.filter((note) => note.endLine === row.lineNumber) : [];
        const showDraft = showNotes && draft?.path === path && draft.endLine === row.lineNumber;
        return <Fragment key={idx}>
          <DiffCodeLine
            row={row}
            tokens={tokenized[idx]!}
            zoom={zoom}
            prefix={lineClassPrefix}
            active={showNotes && row.lineNumber === activeLine}
            lineRef={showNotes && row.lineNumber === activeLine ? activeLineRef : undefined}
            clickableNames={clickableNames}
            path={path}
            links={wikiLinks[idx]!}
            linkEveryToken={linkEveryToken}
            matchRanges={showNotes ? matchesByLine?.get(row.lineNumber) : undefined}
            activeMatchRef={activeMatchRef}
            anchored={showNotes && notes.some((note) => row.lineNumber >= note.startLine && row.lineNumber <= note.endLine)}
            onLineClick={reviewNotes && showNotes ? (line, extend) => selectReviewLine(reviewNotes, source, path, line, extend) : undefined}
          />
          {showNotes && <InlineReviewNotes notes={lineNotes} showDraft={showDraft} zoom={zoom} />}
        </Fragment>;
      })}
    </>
  );
}

/** One tokenizer for the whole document so block comments span rows. */
function tokenizeRows(rows: readonly DiffDisplayRow[], path: string): Token[][] {
  const tokenizer = new LineTokenizer(path);
  return rows.map((row) =>
    row.kind === "remove"
      ? [{ type: "plain", text: row.text }]
      : tokenizer.tokenizeLine(row.text),
  );
}

/** `remove` rows come from the before-snapshot; their links are not navigable. */
function wikiLinksPerRow(rows: readonly DiffDisplayRow[]): WikiLinkSpan[][] {
  return rows.map((row) => (row.kind === "remove" ? [] : findWikiLinks(row.text)));
}

function selectReviewLine(store: NonNullable<ReturnType<typeof useReviewNotesStore>>, source: string, path: string, line: number, extend: boolean) {
  const current = store.getDraft();
  const start = extend && current?.path === path ? Math.min(current.startLine, line) : line;
  const end = extend && current?.path === path ? Math.max(current.startLine, line) : line;
  const lines = source.split("\n").slice(start - 1, end);
  store.beginDraft({ path, startLine: start, endLine: end, anchorLines: lines });
}
