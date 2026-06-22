import { useMemo } from "react";
import { tokenizeCode } from "./highlighter";

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

interface CodeLineProps {
  lineTokens: ReturnType<typeof tokenizeCode>[number];
  idx: number;
  zoom: number;
}

function L2CodeLine({ lineTokens, idx, zoom }: CodeLineProps) {
  const fontSize = 12.5 / zoom;
  const linePadding = `0 ${8 / zoom}px`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: linePadding,
        whiteSpace: "pre",
      }}
    >
      <span
        style={{
          flex: `0 0 ${18 / zoom}px`,
          textAlign: "right",
          paddingRight: 6 / zoom,
          color: "#94a3b8",
          userSelect: "none",
          fontSize: fontSize * 0.9,
        }}
      >
        {idx + 1}
      </span>
      <span style={{ flex: 1 }}>
        {lineTokens.length === 0 ? (
          " "
        ) : (
          lineTokens.map((token, tokenIdx) => (
            <span key={tokenIdx} className={`hl-${token.type}`}>
              {token.text}
            </span>
          ))
        )}
      </span>
    </div>
  );
}

interface CodeBlockProps {
  snippet?: string;
  path?: string;
  zoom: number;
}

export function L2CodeBlock({ snippet, path, zoom }: CodeBlockProps) {
  const lines = useMemo(() => {
    if (!snippet) return [];
    return tokenizeCode(snippet, path ?? "");
  }, [snippet, path]);

  const fontSize = 12.5 / zoom;
  const codePadding = `${6 / zoom}px 0`;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
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
        className="l2-scrollable"
        style={{
          margin: 0,
          padding: codePadding,
          background: "#fafafa",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          borderRadius: 4 / zoom,
          fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
          fontSize,
          lineHeight: 1.4,
          color: "#334155",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {lines.map((lineTokens, idx) => (
          <L2CodeLine key={idx} lineTokens={lineTokens} idx={idx} zoom={zoom} />
        ))}
      </pre>
    </div>
  );
}
