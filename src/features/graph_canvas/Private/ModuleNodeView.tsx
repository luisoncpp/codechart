import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModuleRFNode } from "../../../domain/graph";
import { iconGlyph } from "./icon-map";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

/** A single module box: compact card, facade + selection accents. */
export function ModuleNodeView({ data, selected }: NodeProps<ModuleRFNode>) {
  const glyph = iconGlyph(data.icon);
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
        background: "#ffffff",
        borderRadius: 6,
        border: data.isFacade ? "2px solid #1e293b" : "1px solid #cbd5e1",
        outline: selected ? "2px solid #2563eb" : "none",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      }}
      title={data.label}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      {glyph && <span aria-hidden>{glyph}</span>}
      {data.isFacade && <span aria-hidden style={{ color: "#1e293b" }}>★</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
