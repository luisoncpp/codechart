import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModuleRFNode } from "../../../domain/graph";
import { iconGlyph } from "./icon-map";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

/** Darken a #rrggbb color toward black so label text reads clearly. */
function darken(hex: string, factor = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((n >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** A single module box: compact card, facade + selection accents. */
export function ModuleNodeView({ data, selected }: NodeProps<ModuleRFNode>) {
  const glyph = iconGlyph(data.icon);
  const color = data.color ?? "#64748b";
  const textColor = darken(color);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 8px",
        fontSize: 11,
        fontFamily:
          'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
        color: textColor,
        background: `${color}1a`,
        borderRadius: 6,
        border: `${data.isFacade ? 2 : 1}px solid ${color}`,
        outline: selected ? "2px solid #2563eb" : "none",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      }}
      title={data.label}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      {glyph && <span aria-hidden>{glyph}</span>}
      {data.isFacade && <span aria-hidden style={{ color: textColor }}>★</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
