import { memo } from "react";
import type { DiffNote, FileLineDiff } from "../../../../domain/diff";
import { DiffCodeLines } from "../highlight/DiffCodeLines";
import { segmentTokenText, type LineMatchRange } from "../highlight/match-highlight";
import { renderBlockMarkdown } from "../descriptions/render-markdown";

interface DescriptionProps {
  description?: string;
  color: string;
  zoom: number;
  /** Find-in-frame ranges over the description string. */
  matchRanges?: readonly LineMatchRange[];
  activeMatchRef?: React.RefObject<HTMLElement | null>;
}

function DescriptionText({ description, matchRanges, activeMatchRef }: Omit<DescriptionProps, "color" | "zoom">) {
  if (!description) {
    return (
      <span style={{ fontStyle: "italic", color: "#94a3b8" }}>
        No description provided for this module.
      </span>
    );
  }
  if (!matchRanges?.length) {
    const html = renderBlockMarkdown(description);
    return (
      <div
        className="l2-desc-markdown"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <>
      {segmentTokenText(description, /*tokenStart=*/0, matchRanges).map((segment, i) =>
        segment.match ? (
          <span
            key={i}
            ref={segment.match === "active" ? (activeMatchRef as React.Ref<HTMLSpanElement>) : undefined}
            className={`hl-match${segment.match === "active" ? " hl-match--active" : ""}`}
          >
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}

export const L2Description = memo(function L2Description({
  description,
  color,
  zoom,
  matchRanges,
  activeMatchRef,
}: DescriptionProps) {
  const descSize = 13.75 / zoom;
  const padding = `${6 / zoom}px ${8 / zoom}px`;
  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: "#f8fafc",
        borderLeft: `${3 / zoom}px solid ${color}`,
        borderRadius: `0 ${4 / zoom}px ${4 / zoom}px 0`,
        padding,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 8 / zoom,
          fontWeight: "bold",
          color: "#64748b",
          textTransform: "uppercase",
          marginBottom: 2 / zoom,
          letterSpacing: "0.5px",
        }}
      >
        Description
      </div>
      <div
        style={{
          fontSize: descSize,
          lineHeight: 1.4,
          color: "#334155",
          whiteSpace: "normal",
          wordBreak: "break-word",
        }}
      >
        <DescriptionText
          description={description}
          matchRanges={matchRanges}
          activeMatchRef={activeMatchRef}
        />
      </div>
    </div>
  );
});

interface CodeBlockProps {
  snippet?: string;
  path?: string;
  zoom: number;
  fileDiff?: FileLineDiff;
  diffNotes?: readonly DiffNote[];
  clickableNames?: ReadonlySet<string>;
  lineClassPrefix?: string;
  matchesByLine?: ReadonlyMap<number, readonly LineMatchRange[]>;
  activeMatchRef?: React.RefObject<HTMLElement | null>;
  activeLine?: number;
  activeLineRef?: React.RefObject<HTMLDivElement | null>;
}

export const L2CodeBlock = memo(function L2CodeBlock({
  snippet,
  path,
  zoom,
  fileDiff,
  diffNotes,
  clickableNames,
  lineClassPrefix,
  matchesByLine,
  activeMatchRef,
  activeLine,
  activeLineRef,
}: CodeBlockProps) {
  const codePadding = `${6 / zoom}px 0`;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div
        style={{
          fontSize: 8 / zoom,
          fontWeight: "bold",
          color: "#64748b",
          textTransform: "uppercase",
          marginBottom: 2 / zoom,
          letterSpacing: "0.5px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        Source Code
      </div>
      <div style={{ width: "100%", minWidth: 0 }}><pre
        style={{
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          margin: 0,
          padding: codePadding,
          background: "#fafafa",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          borderRadius: 4 / zoom,
          fontFamily:
            'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
          fontSize: 12.5 / zoom,
          lineHeight: 1.4,
          color: "#334155",
        }}
      >
        {snippet || hasDiffRows(fileDiff, diffNotes) ? (
          <DiffCodeLines
            source={snippet ?? ""}
            path={path ?? ""}
            fileDiff={fileDiff}
            diffNotes={diffNotes}
            zoom={zoom}
            lineClassPrefix={lineClassPrefix ?? "diff-code"}
            clickableNames={clickableNames}
            matchesByLine={matchesByLine}
            activeMatchRef={activeMatchRef}
            activeLine={activeLine}
            activeLineRef={activeLineRef}
          />
        ) : null}
      </pre></div>
    </div>
  );
});

function hasDiffRows(fileDiff?: FileLineDiff, diffNotes?: readonly DiffNote[]): boolean {
  if (diffNotes && diffNotes.length > 0) return true;
  if (!fileDiff) return false;
  return fileDiff.addedLineNumbers.size > 0 || fileDiff.removeBeforeLine.size > 0;
}
