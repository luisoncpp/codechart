import { Fragment, useMemo } from "react";
import {
  buildModuleDiffDisplay,
  type DiffDisplayRow,
  type FileLineDiff,
} from "../../../domain/diff";
import { tokenizeCode, type Token } from "./highlighter";
import { segmentTokenText, type LineMatchRange } from "./match-highlight";
import { InlineReviewNotes, useReviewNotesStore } from "../../review_notes";

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
  const tokenized = useMemo(
    () => rows.map((row) => tokenizeRow(row, path)),
    [rows, path],
  );

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

function tokenizeRow(row: DiffDisplayRow, path: string): Token[] {
  if (row.kind === "remove") {
    return [{ type: "plain", text: row.text }];
  }
  return tokenizeCode(row.text, path)[0] ?? [];
}

interface DiffCodeLineProps {
  row: DiffDisplayRow;
  tokens: Token[];
  zoom: number;
  prefix: string;
  active?: boolean;
  lineRef?: React.RefObject<HTMLDivElement | null>;
  clickableNames?: ReadonlySet<string>;
  anchored?: boolean;
  onLineClick?: (line: number, extend: boolean) => void;
  matchRanges?: readonly LineMatchRange[];
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

/** Token types whose text can never be a navigable identifier. */
const NON_CLICKABLE_TYPES = new Set(["string", "comment", "keyword", "number"]);

function tokenClass(token: Token, clickableNames?: ReadonlySet<string>): string {
  const clickable =
    clickableNames?.has(token.text) && !NON_CLICKABLE_TYPES.has(token.type);
  return `hl-${token.type}${clickable ? " hl-clickable" : ""}`;
}

function DiffCodeLine({ row, tokens, zoom, prefix, active, lineRef, clickableNames, anchored, onLineClick, matchRanges, activeMatchRef }: DiffCodeLineProps) {
  let tokenStart = 0;
  const fontSize = 12.5 / zoom;
  const gutter = row.kind === "add" ? "+" : row.kind === "remove" ? "-" : " ";
  const lineNumber = row.kind === "remove" ? "" : String(row.lineNumber);

  return (
    <div
      ref={lineRef}
      className={`${prefix}__line ${prefix}__line--${row.kind}${active ? ` ${prefix}__line--active` : ""}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: `0 ${8 / zoom}px`,
        whiteSpace: "pre",
        fontSize,
        lineHeight: 1.4,
      }}
    >
      <span
        className={`${prefix}__gutter ${prefix}__gutter--${row.kind}`}
        style={{
          flex: `0 0 ${22 / zoom}px`,
          textAlign: "right",
          paddingRight: 6 / zoom,
          userSelect: "none",
          fontSize: fontSize * 0.9,
        }}
      >
        {gutter}
      </span>
      {row.kind === "remove" ? <span
        className={`${prefix}__ln`}
        style={{
          flex: `0 0 ${18 / zoom}px`,
          textAlign: "right",
          paddingRight: 6 / zoom,
          color: "#94a3b8",
          userSelect: "none",
          fontSize: fontSize * 0.9,
        }}
      >
        {lineNumber}
      </span> : <button type="button" className={`${prefix}__ln`} onClick={(event) => onLineClick?.(row.lineNumber, event.shiftKey)} style={{ flex: `0 0 ${18 / zoom}px`, textAlign: "right", paddingRight: 6 / zoom, color: "#94a3b8", border: 0, background: "transparent", cursor: "pointer", fontSize: fontSize * 0.9 }}>{lineNumber}</button>}
      <span className={`${prefix}__text${anchored ? ` ${prefix}__text--review-note` : ""}`} style={{ flex: 1, background: anchored ? "#f3e8ff" : undefined }}>
        {tokens.length === 0 ? " " : tokens.map((token, i) => {
          const start = tokenStart;
          tokenStart += token.text.length;
          return (
            <span key={i} className={tokenClass(token, clickableNames)}>
              {matchRanges?.length
                ? renderTokenSegments(token.text, start, { matchRanges, activeMatchRef })
                : token.text}
            </span>
          );
        })}
      </span>
    </div>
  );
}

interface SegmentOptions {
  matchRanges: readonly LineMatchRange[];
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

/** Nested match spans keep the token span's full textContent intact. */
function renderTokenSegments(text: string, tokenStart: number, options: SegmentOptions) {
  const segments = segmentTokenText(text, tokenStart, options.matchRanges);
  if (segments.length === 1 && !segments[0]!.match) return text;
  return segments.map((segment, i) =>
    segment.match ? (
      <span
        key={i}
        ref={segment.match === "active" ? (options.activeMatchRef as React.Ref<HTMLSpanElement>) : undefined}
        className={`hl-match${segment.match === "active" ? " hl-match--active" : ""}`}
      >
        {segment.text}
      </span>
    ) : (
      segment.text
    ),
  );
}

function selectReviewLine(store: NonNullable<ReturnType<typeof useReviewNotesStore>>, source: string, path: string, line: number, extend: boolean) {
  const current = store.getDraft();
  const start = extend && current?.path === path ? Math.min(current.startLine, line) : line;
  const end = extend && current?.path === path ? Math.max(current.startLine, line) : line;
  const lines = source.split("\n").slice(start - 1, end);
  store.beginDraft({ path, startLine: start, endLine: end, anchorLines: lines });
}
