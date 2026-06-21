import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GroupRFNode, GroupNodeData } from "../../../domain/graph";
import { iconGlyph } from "./icon-map";
import { useZoomCounterScale } from "./use-zoom-counter-scale";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

/** Colored container with a header icon + label — the sample's group boxes.
 *  A collapsed group (semantic zoom) shows a readable card with its annotation. */
export function GroupNodeView({ data }: NodeProps<GroupRFNode>) {
  const scale = useZoomCounterScale();
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
      {/* Invisible handles so a collapsed group can be an edge endpoint (L0
          group→group edges). FloatingEdge ignores their position. */}
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      {data.collapsed ? (
        <CollapsedCard data={data} scale={scale} />
      ) : (
        <ExpandedHeader data={data} scale={scale} />
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

/** Expanded: a quiet header strip; the modules inside carry the detail.
 *  Counter-scales with the camera so the group name stays legible when zoomed
 *  out — the level at which the group, not its modules, is what you read. */
function ExpandedHeader({ data, scale }: { data: GroupNodeData; scale: number }) {
  const glyph = iconGlyph(data.icon);
  return (
    <div style={headerStyle(data.color, scale)} title="Double-click to collapse / expand">
      <span aria-hidden>▾</span>
      {glyph && <span aria-hidden>{glyph}</span>}
      <span>{data.label}</span>
    </div>
  );
}

/** Collapsed: the box keeps its size, so its content (not the box) is what
 *  communicates — a big label + a readable, wrapped description. Both font sizes
 *  counter-scale with the camera so they stay legible when zoomed out. */
function CollapsedCard({ data, scale }: { data: GroupNodeData; scale: number }) {
  const glyph = iconGlyph(data.icon);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        padding: 16,
        gap: 8 * scale,
      }}
      title="Double-click to expand"
    >
      <div style={cardLabelStyle(data.color, scale)}>
        {glyph && <span aria-hidden>{glyph}</span>}
        <span>{data.label}</span>
      </div>
      {data.descriptionShort && (
        <p style={cardDescriptionStyle(scale)}>{data.descriptionShort}</p>
      )}
    </div>
  );
}

function headerStyle(color: string, scale: number) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6 * scale,
    padding: `${4 * scale}px ${10 * scale}px`,
    fontSize: 12 * scale,
    fontFamily: SANS,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
    color,
  };
}

function cardLabelStyle(color: string, scale: number) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6 * scale,
    fontSize: 15 * scale,
    fontFamily: SANS,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    lineHeight: 1.1,
    color,
  };
}

function cardDescriptionStyle(scale: number) {
  return {
    margin: 0,
    fontSize: 12 * scale,
    fontFamily: SANS,
    lineHeight: 1.35,
    color: "#475569",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical" as const,
  };
}
