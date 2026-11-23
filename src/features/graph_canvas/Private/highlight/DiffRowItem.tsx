// @Architecture(descriptionShort="One code row plus its chrome: Diff Notes below it and Review Notes anchored to it")
import { Fragment } from "react";
import type { DiffDisplayRow, DiffNote } from "../../../../domain/diff";
import type { Token } from "./highlighter-types";
import type { ActiveMatch, LineMatchRange } from "./match-highlight";
import { DiffCodeLine } from "./DiffCodeLine";
import type { RowChrome } from "./row-chrome";
import type { WikiLinkSpan } from "../wiki_links";
import { InlineReviewNotes } from "../../../review_notes";
import { DiffNotesList } from "../../../diff_visualizer";
import { InlineFindings } from "../../../review_stack";
import type { CohortHunk, ReviewFinding } from "../../../../ipc/review-stack-client";

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
  activeMatch?: ActiveMatch;
  activeMatchRef?: React.RefObject<HTMLElement | null>;
  notes: any[];
  draft: any;
  diffNotes?: readonly DiffNote[];
  findings?: readonly ReviewFinding[];
  /** The spotlighted cohort's hunks in this file; rows inside one get the cohort band. */
  cohortRanges?: readonly CohortHunk[];
  onLineClick?: (line: number, extend: boolean) => void;
  /** Left column of the split view: even context rows show the before-file. */
  beforeSide?: boolean;
}

const isBeforeRow = (row: DiffDisplayRow, beforeSide?: boolean) =>
  beforeSide || row.kind === "remove" || row.kind === "move-remove";

/** Row-local boolean so the memoized `DiffCodeLine` never sees the range list. */
function inCohortRange(row: DiffDisplayRow, ranges?: readonly CohortHunk[], beforeSide?: boolean) {
  if (!ranges || ranges.length === 0) return false;
  const side = isBeforeRow(row, beforeSide) ? "before" : "after";
  const line = row.lineNumber;
  return ranges.some((h) => (h.side ?? "after") === side && line >= h.startLine && line <= h.endLine);
}

export function DiffRowItem(props: DiffRowItemProps) {
  const { row, tokens, chrome, clickableNames, links, diffNotes, beforeSide } = props;
  if (!isBeforeRow(row, beforeSide)) return <CurrentRowItem {...props} />;

  // Before-snapshot rows: no clickable line number, no find matches and no
  // Review Notes anchored to them.
  return (
    <Fragment>
      <DiffCodeLine
        row={row}
        tokens={tokens}
        chrome={chrome}
        clickableNames={clickableNames}
        links={links}
        beforeSide={beforeSide}
        inCohort={inCohortRange(row, props.cohortRanges, beforeSide)}
      />
      <RowDiffNotes row={row} diffNotes={diffNotes} zoom={chrome.zoom} beforeSide={beforeSide} />
      <RowFindings row={row} findings={props.findings} zoom={chrome.zoom} beforeSide={beforeSide} />
    </Fragment>
  );
}

/** A row of the current file: clickable number, find matches, Review Notes. */
function CurrentRowItem(props: Omit<DiffRowItemProps, "beforeSide">) {
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
        // Row-local slices only: `DiffCodeLine` is memoized, so a whole-document
        // value here would re-render every row on every find keystroke.
        matchRanges={props.matchesByLine?.get(line)} activeMatchRef={props.activeMatchRef}
        activeMatchCol={props.activeMatch?.line === line ? props.activeMatch.startCol : undefined}
        anchored={isAnchored}
        inCohort={inCohortRange(row, props.cohortRanges)}
        onLineClick={props.onLineClick}
      />
      {/* Diff Notes and Agent Findings stack above Review Notes on the same line. */}
      <RowDiffNotes row={row} diffNotes={props.diffNotes} zoom={chrome.zoom} />
      <RowFindings row={row} findings={props.findings} zoom={chrome.zoom} />
      <InlineReviewNotes notes={lineNotes} showDraft={isDraft} zoom={chrome.zoom} />
    </Fragment>
  );
}

interface RowDiffNotesProps {
  row: DiffDisplayRow;
  diffNotes?: readonly DiffNote[];
  zoom: number;
  beforeSide?: boolean;
}

/** Diff Notes bound to this row's line number, on its own side of the diff. */
function RowDiffNotes({ row, diffNotes, zoom, beforeSide }: RowDiffNotesProps) {
  if (!diffNotes || diffNotes.length === 0) return null;
  const side = isBeforeRow(row, beforeSide) ? "before" : "after";
  const matching = diffNotes.filter((n) => n.side === side && n.endLine === row.lineNumber);
  if (matching.length === 0) return null;
  return <DiffNotesList notes={matching} zoom={zoom} />;
}

interface RowFindingsProps {
  row: DiffDisplayRow;
  findings?: readonly ReviewFinding[];
  zoom: number;
  beforeSide?: boolean;
}

function RowFindings({ row, findings, zoom, beforeSide }: RowFindingsProps) {
  if (!findings || findings.length === 0) return null;
  const side = isBeforeRow(row, beforeSide) ? "before" : "after";
  const matching = findings.filter((f) => f.side === side && f.endLine === row.lineNumber);
  if (matching.length === 0) return null;
  return <InlineFindings findings={matching} zoom={zoom} />;
}
