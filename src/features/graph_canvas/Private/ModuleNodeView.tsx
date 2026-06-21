import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModuleRFNode, ModuleNodeData } from "../../../domain/graph";
import { fitLabelFontSize, MODULE_BOX } from "../../../domain/layout";
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

/** Module container: label-only at L1; symbol children appear inside at L1.5+. */
export function ModuleNodeView({ data, selected, width, height }: NodeProps<ModuleRFNode>) {
  const color = data.color ?? "#64748b";
  const textColor = darken(color);
  const detail = data.showSymbols || !!data.snippet;
  // L1: grow the centered label to fill its box; L2 keeps the compact 9px label.
  const fontSize = detail
    ? 9
    : fitLabelFontSize(data.label, width ?? MODULE_BOX.minWidth, height ?? MODULE_BOX.minHeight);
  return (
    <div
      style={cardStyle(color, textColor, data.isFacade, selected, detail)}
      title={data.descriptionShort ?? data.label}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      {data.snippet && <Snippet source={data.snippet} />}
      <Header data={data} textColor={textColor} detail={detail} fontSize={fontSize} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

/** Label scales with the box (world units, no camera counter-scale): the box is
 *  laid out to fit this size, so the text never overflows it as you zoom. */
function Header({
  data,
  textColor,
  detail,
  fontSize,
}: {
  data: ModuleNodeData;
  textColor: string;
  detail: boolean;
  fontSize: number;
}) {
  const glyph = iconGlyph(data.icon);
  const base = {
    display: "flex" as const,
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    overflow: "hidden",
    fontSize,
    lineHeight: 1.15,
    pointerEvents: "none" as const,
    zIndex: 1,
  };
  return (
    <div
      style={
        detail
          ? { ...base, position: "relative", padding: "2px 4px 0" }
          : {
              ...base,
              position: "absolute",
              inset: 0,
              justifyContent: "center",
              padding: "0 8px",
            }
      }
    >
      {glyph && <span aria-hidden>{glyph}</span>}
      {data.isFacade && (
        <span aria-hidden style={{ color: textColor, fontSize: 9 }}>
          ★
        </span>
      )}
      <span
        style={{
          overflow: "hidden",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          textAlign: detail ? "left" : "center",
        }}
      >
        {data.label}
      </span>
    </div>
  );
}

function Snippet({ source }: { source: string }) {
  const text = source.split("\n").slice(0, SNIPPET_LINES).join("\n");
  return (
    <pre
      style={{
        position: "absolute",
        inset: 0,
        margin: 0,
        padding: "22px 6px 6px",
        fontSize: 8,
        lineHeight: 1.35,
        color: "#1e293b",
        background: "#ffffffcc",
        border: "none",
        overflow: "hidden",
        whiteSpace: "pre",
        pointerEvents: "none",
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
  detail: boolean,
) {
  return {
    position: "relative" as const,
    width: "100%",
    height: "100%",
    boxSizing: "border-box" as const,
    fontFamily:
      'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
    color: textColor,
    background: detail ? `${color}0d` : `${color}1a`,
    borderRadius: 6,
    border: `${isFacade ? 2 : 1}px solid ${color}`,
    outline: selected ? "2px solid #2563eb" : "none",
    overflow: "hidden",
  };
}
