import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModuleRFNode, ModuleNodeData } from "../../../domain/graph";
import { iconGlyph } from "./icon-map";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;
const SNIPPET_LINES = 12;

/** Darken a #rrggbb color toward black so label text reads clearly. */
function darken(hex: string, factor = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((n >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** A single module box: compact card, or a code card at L2 (when a snippet is set). */
export function ModuleNodeView({ data, selected }: NodeProps<ModuleRFNode>) {
  const color = data.color ?? "#64748b";
  const textColor = darken(color);
  return (
    <div
      style={cardStyle(color, textColor, data.isFacade, selected, !!data.snippet)}
      title={data.descriptionShort ?? data.label}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Header data={data} textColor={textColor} />
      {data.snippet && <Snippet source={data.snippet} color={color} />}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

function Header({ data, textColor }: { data: ModuleNodeData; textColor: string }) {
  const glyph = iconGlyph(data.icon);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
      {glyph && <span aria-hidden>{glyph}</span>}
      {data.isFacade && <span aria-hidden style={{ color: textColor }}>★</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {data.label}
      </span>
    </div>
  );
}

function Snippet({ source, color }: { source: string; color: string }) {
  const text = source.split("\n").slice(0, SNIPPET_LINES).join("\n");
  return (
    <pre
      style={{
        flex: 1,
        margin: "6px 0 0",
        padding: 6,
        fontSize: 9,
        lineHeight: 1.35,
        color: "#1e293b",
        background: "#ffffff",
        border: `1px solid ${color}40`,
        borderRadius: 4,
        overflow: "hidden",
        whiteSpace: "pre",
      }}
    >
      {text}
    </pre>
  );
}

function cardStyle(
  color: string,
  textColor: string,
  isFacade: boolean,
  selected: boolean,
  snippet: boolean,
) {
  return {
    width: "100%",
    height: "100%",
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: snippet ? "flex-start" : "center",
    padding: snippet ? 8 : "0 8px",
    fontSize: 11,
    fontFamily:
      'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
    color: textColor,
    background: `${color}1a`,
    borderRadius: 6,
    border: `${isFacade ? 2 : 1}px solid ${color}`,
    outline: selected ? "2px solid #2563eb" : "none",
    overflow: "hidden",
  };
}
