import { useMemo } from "react";
import {
  buildModuleDiffDisplay,
  type DiffDisplayRow,
  type FileLineDiff,
} from "../../../domain/diff";
import { tokenizeCode, type Token } from "./highlighter";

interface DiffCodeLinesProps {
  source: string;
  path: string;
  fileDiff?: FileLineDiff;
  zoom?: number;
  lineClassPrefix?: string;
  activeLine?: number;
  activeLineRef?: React.RefObject<HTMLDivElement | null>;
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
}: DiffCodeLinesProps) {
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
      {rows.map((row, idx) => (
        <DiffCodeLine
          key={idx}
          row={row}
          tokens={tokenized[idx]!}
          zoom={zoom}
          prefix={lineClassPrefix}
          active={row.kind !== "remove" && row.lineNumber === activeLine}
          lineRef={row.kind !== "remove" && row.lineNumber === activeLine ? activeLineRef : undefined}
        />
      ))}
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
}

function DiffCodeLine({ row, tokens, zoom, prefix, active, lineRef }: DiffCodeLineProps) {
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
      <span
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
      </span>
      <span className={`${prefix}__text`} style={{ flex: 1 }}>
        {tokens.length === 0 ? " " : tokens.map((token, i) => (
          <span key={i} className={`hl-${token.type}`}>
            {token.text}
          </span>
        ))}
      </span>
    </div>
  );
}

export function moduleDiffOpacity(
  diffState?: "affected" | "deleted" | "unchanged",
): number {
  if (diffState === "unchanged") return 0.4;
  return 1;
}

export function moduleDiffBorderWidth(
  diffState: "affected" | "deleted" | "unchanged" | undefined,
  fallbackPx = 2,
): number {
  if (diffState === "affected" || diffState === "deleted") return 3;
  return fallbackPx;
}

export function moduleDiffBorder(
  diffState: "affected" | "deleted" | "unchanged" | undefined,
  fallback: string,
): string {
  if (diffState === "affected") return "3px solid #16a34a";
  if (diffState === "deleted") return "3px solid #dc2626";
  return fallback;
}
