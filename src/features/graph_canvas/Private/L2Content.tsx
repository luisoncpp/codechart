import type { FileLineDiff } from "../../../domain/diff";
import { DiffCodeLines } from "./DiffCodeLines";

interface DescriptionProps {
  description?: string;
  color: string;
  zoom: number;
}

export function L2Description({ description, color, zoom }: DescriptionProps) {
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
        {description || (
          <span style={{ fontStyle: "italic", color: "#94a3b8" }}>
            No description provided for this module.
          </span>
        )}
      </div>
    </div>
  );
}

interface CodeBlockProps {
  snippet?: string;
  path?: string;
  zoom: number;
  fileDiff?: FileLineDiff;
}

export function L2CodeBlock({ snippet, path, zoom, fileDiff }: CodeBlockProps) {
  const codePadding = `${6 / zoom}px 0`;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "max-content", minWidth: "100%" }}>
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
      <pre
        style={{
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
        {snippet ? (
          <DiffCodeLines
            source={snippet}
            path={path ?? ""}
            fileDiff={fileDiff}
            zoom={zoom}
            lineClassPrefix="diff-code"
          />
        ) : null}
      </pre>
    </div>
  );
}
