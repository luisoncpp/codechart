import { Fragment, useMemo } from "react";
import {
  buildModuleDiffDisplay,
  type DiffDisplayRow,
  type DiffNote,
  type FileLineDiff,
} from "../../../../domain/diff";
import type { Token } from "./highlighter";
import { LineTokenizer } from "./line-tokenizer";
import type { LineMatchRange } from "./match-highlight";
import { DiffCodeLine } from "./DiffCodeLine";
import { findWikiLinks, isMarkdownPath, type WikiLinkSpan } from "../wiki_links";
import { InlineReviewNotes, useReviewNotesStore } from "../../../review_notes";
import { DiffNotesList } from "../../../diff_visualizer";

interface DiffCodeLinesProps {
  source: string;
  path: string;
  fileDiff?: FileLineDiff;
  diffNotes?: readonly DiffNote[];
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
  diffNotes,
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
      {rows.map((row, idx) => (
        <DiffRowItem
          key={idx}
          row={row}
          tokens={tokenized[idx]!}
          zoom={zoom}
          prefix={lineClassPrefix}
          activeLine={activeLine}
          activeLineRef={activeLineRef}
          clickableNames={clickableNames}
          path={path}
          links={wikiLinks[idx]!}
          linkEveryToken={linkEveryToken}
          matchesByLine={matchesByLine}
          activeMatchRef={activeMatchRef}
          notes={notes}
          draft={draft}
          diffNotes={diffNotes}
          onLineClick={reviewNotes ? (line, extend) => selectReviewLine(reviewNotes, source, path, line, extend) : undefined}
        />
      ))}
    </>
  );
}

interface DiffRowItemProps {
  row: DiffDisplayRow;
  tokens: Token[];
  zoom: number;
  prefix: string;
  activeLine?: number;
  activeLineRef?: React.RefObject<HTMLDivElement | null>;
  clickableNames?: ReadonlySet<string>;
  path: string;
  links: readonly WikiLinkSpan[];
  linkEveryToken: boolean;
  matchesByLine?: ReadonlyMap<number, readonly LineMatchRange[]>;
  activeMatchRef?: React.RefObject<HTMLElement | null>;
  notes: any[];
  draft: any;
  diffNotes?: readonly DiffNote[];
  onLineClick?: (line: number, extend: boolean) => void;
}

function DiffRowItem(props: DiffRowItemProps) {
  const { row, tokens, zoom, prefix, activeLine, activeLineRef, clickableNames, path, links, linkEveryToken, matchesByLine, activeMatchRef, notes, draft, diffNotes, onLineClick } = props;
  const isRem = row.kind === "remove" || row.kind === "move-remove";
  const matchingDiffNotes = matchingDiffNotesForRow(row, diffNotes);

  if (isRem) {
    return (
      <Fragment>
        <DiffCodeLine
          row={row}
          tokens={tokens}
          zoom={zoom}
          prefix={prefix}
          clickableNames={clickableNames}
          path={path}
          links={links}
          linkEveryToken={linkEveryToken}
        />
        {matchingDiffNotes.length > 0 && <DiffNotesList notes={matchingDiffNotes} zoom={zoom} />}
      </Fragment>
    );
  }

  const line = row.lineNumber;
  const isActive = line === activeLine;
  const isDraft = draft?.path === path && draft.endLine === line;
  const lineNotes = notes.filter((n) => n.endLine === line);
  const isAnchored = notes.some((n) => line >= n.startLine && line <= n.endLine);

  return (
    <Fragment>
      <DiffCodeLine
        row={row}
        tokens={tokens}
        zoom={zoom}
        prefix={prefix}
        active={isActive}
        lineRef={isActive ? activeLineRef : undefined}
        clickableNames={clickableNames}
        path={path}
        links={links}
        linkEveryToken={linkEveryToken}
        matchRanges={matchesByLine?.get(line)}
        activeMatchRef={activeMatchRef}
        anchored={isAnchored}
        onLineClick={onLineClick}
      />
      {matchingDiffNotes.length > 0 && <DiffNotesList notes={matchingDiffNotes} zoom={zoom} />}
      <InlineReviewNotes notes={lineNotes} showDraft={isDraft} zoom={zoom} />
    </Fragment>
  );
}

function matchingDiffNotesForRow(
  row: DiffDisplayRow,
  diffNotes?: readonly DiffNote[],
): readonly DiffNote[] {
  if (!diffNotes || diffNotes.length === 0) return [];
  const side = row.kind === "remove" || row.kind === "move-remove" ? "before" : "after";
  return diffNotes.filter((n) => n.side === side && n.endLine === row.lineNumber);
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
