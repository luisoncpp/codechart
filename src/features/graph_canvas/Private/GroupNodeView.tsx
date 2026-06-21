import type { NodeProps } from "@xyflow/react";
import type { GroupRFNode } from "../../../domain/graph";
import { iconGlyph } from "./icon-map";

/** Colored container with a header icon + label — the sample's group boxes.
 *  A collapsed group (semantic zoom) shows a caret + its annotation subtitle. */
export function GroupNodeView({ data }: NodeProps<GroupRFNode>) {
  const glyph = iconGlyph(data.icon);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        border: `2px solid ${data.color}`,
        borderRadius: 10,
        background: `${data.color}14`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          fontSize: 12,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: data.color,
        }}
        title="Double-click to collapse / expand"
      >
        <span aria-hidden>{data.collapsed ? "▸" : "▾"}</span>
        {glyph && <span aria-hidden>{glyph}</span>}
        <span>{data.label}</span>
      </div>
      {data.collapsed && data.descriptionShort && (
        <div
          style={{
            padding: "0 10px",
            fontSize: 10,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            color: "#64748b",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.descriptionShort}
        </div>
      )}
    </div>
  );
}
