// @Architecture(descriptionShort="One code row plus its chrome: Diff Notes below it and Review Notes anchored to it")
import { Fragment } from "react";
import type { DiffDisplayRow, DiffNote } from "../../../../domain/diff";
import type { Token } from "./highlighter";
import type { LineMatchRange } from "./match-highlight";
import { DiffCodeLine } from "./DiffCodeLine";
import type { RowChrome } from "./row-chrome";
import type { WikiLinkSpan } from "../wiki_links";
import { InlineReviewNotes } from "../../../review_notes";
import { DiffNotesList } from "../../../diff_visualizer";

export interface DiffRowItemProps {
  row: DiffDisplayRow;
  tokens: Token[];
  /** Built once per document by `DiffCodeLines`; identical for every row. */
  chrome: RowChrome;
  links: readonly WikiLinkSpan[];
  activeLine?: number;
  activeLineRef?: React.RefObject<HTMLDivElement | null>;
  clickableNames?: ReadonlySet<string>;
  matchesByLine?: ReadonlyMap<number, readonly LineMatchRange[]>;
  activeMatchRef?: React.RefObject<HTMLElement | null>;
  notes: any[];
  draft: any;
  diffNotes?: readonly DiffNote[];
  onLineClick?: (line: number, extend: boolean) => void;
}

export function DiffRowItem(props: DiffRowItemProps) {
  const { row, tokens, chrome, clickableNames, links, diffNotes } = props;
  const isRem = row.kind === "remove" || row.kind === "move-remove";
  if (!isRem) return <CurrentRowItem {...props} />;

  // `remove` rows come from the before-snapshot: no clickable line number, no
  // find matches and no Review Notes anchored to them.
  return (
    <Fragment>
      <DiffCodeLine
        row={row}
        tokens={tokens}
        chrome={chrome}
        clickableNames={clickableNames}
        links={links}
      />
      <RowDiffNotes row={row} diffNotes={diffNotes} zoom={chrome.zoom} />
    </Fragment>
  );
}

/** A row of the current file: clickable number, find matches, Review Notes. */
function CurrentRowItem(props: DiffRowItemProps) {
  const { row, tokens, chrome, clickableNames, links, notes, draft } = props;
  const line = row.lineNumber;
  const isActive = line === props.activeLine;
  const isDraft = draft?.path === chrome.path && draft.endLine === line;
  const lineNotes = notes.filter((n) => n.endLine === line);
  const isAnchored = notes.some((n) => line >= n.startLine && line <= n.endLine);
  return (
    <Fragment>
      <DiffCodeLine
        row={row} tokens={tokens} chrome={chrome} links={links}
        active={isActive} lineRef={isActive ? props.activeLineRef : undefined}
        clickableNames={clickableNames}
        matchRanges={props.matchesByLine?.get(line)} activeMatchRef={props.activeMatchRef}
        anchored={isAnchored}
        onLineClick={props.onLineClick}
      />
      {/* Diff Notes stack above Review Notes on the same line. */}
      <RowDiffNotes row={row} diffNotes={props.diffNotes} zoom={chrome.zoom} />
      <InlineReviewNotes notes={lineNotes} showDraft={isDraft} zoom={chrome.zoom} />
    </Fragment>
  );
}

interface RowDiffNotesProps {
  row: DiffDisplayRow;
  diffNotes?: readonly DiffNote[];
  zoom: number;
}

/** Diff Notes bound to this row's line number, on its own side of the diff. */
function RowDiffNotes({ row, diffNotes, zoom }: RowDiffNotesProps) {
  if (!diffNotes || diffNotes.length === 0) return null;
  const side = row.kind === "remove" || row.kind === "move-remove" ? "before" : "after";
  const matching = diffNotes.filter((n) => n.side === side && n.endLine === row.lineNumber);
  if (matching.length === 0) return null;
  return <DiffNotesList notes={matching} zoom={zoom} />;
}
