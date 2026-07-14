import { Fragment, useMemo } from "react";
import {
  buildModuleDiffDisplay,
  UNCHANGED_MODULE_DIFF_OPACITY,
  type DiffDisplayRow,
  type FileLineDiff,
} from "../../../domain/diff";
import { tokenizeCode, type Token } from "./highlighter";
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
}

/** Token types whose text can never be a navigable identifier. */
const NON_CLICKABLE_TYPES = new Set(["string", "comment", "keyword", "number"]);

function tokenClass(token: Token, clickableNames?: ReadonlySet<string>): string {
  const clickable =
    clickableNames?.has(token.text) && !NON_CLICKABLE_TYPES.has(token.type);
  return `hl-${token.type}${clickable ? " hl-clickable" : ""}`;
}

function DiffCodeLine({ row, tokens, zoom, prefix, active, lineRef, clickableNames, anchored, onLineClick }: DiffCodeLineProps) {
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
        {tokens.length === 0 ? " " : tokens.map((token, i) => (
          <span key={i} className={tokenClass(token, clickableNames)}>
            {token.text}
          </span>
        ))}
      </span>
    </div>
  );
}

function selectReviewLine(store: NonNullable<ReturnType<typeof useReviewNotesStore>>, source: string, path: string, line: number, extend: boolean) {
  const current = store.getDraft();
  const start = extend && current?.path === path ? Math.min(current.startLine, line) : line;
  const end = extend && current?.path === path ? Math.max(current.startLine, line) : line;
  const lines = source.split("\n").slice(start - 1, end);
  store.beginDraft({ path, startLine: start, endLine: end, anchorLines: lines });
}

export function moduleDiffOpacity(
  diffState?: "affected" | "deleted" | "unchanged",
): number {
  if (diffState === "unchanged") return UNCHANGED_MODULE_DIFF_OPACITY;
  return 1;
}

const DIFF_MODULE_BORDER_PX = 3;

export function moduleDiffBorderWidth(
  diffState: "affected" | "deleted" | "unchanged" | undefined,
  fallbackPx = 2,
): number {
  if (diffState === "affected" || diffState === "deleted") return DIFF_MODULE_BORDER_PX;
  return fallbackPx;
}

export function moduleDiffBorder(
  diffState: "affected" | "deleted" | "unchanged" | undefined,
  fallback: string,
  counterScale = 1,
): string {
  const px = DIFF_MODULE_BORDER_PX * counterScale;
  if (diffState === "affected") return `${px}px solid #16a34a`;
  if (diffState === "deleted") return `${px}px solid #dc2626`;
  return fallback;
}
