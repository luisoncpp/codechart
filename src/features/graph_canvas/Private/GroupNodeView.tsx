// @Architecture(descriptionShort="Renders group boundaries, titles, and descriptions")
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GroupRFNode, GroupNodeData } from "../../../domain/graph";
import { DESC_BOX, PRESETS } from "../../../domain/layout";
import { iconGlyph } from "./icon-map";
import { useZoomCounterScale } from "./use-zoom-counter-scale";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

/** Darken a #rrggbb color toward black so description text reads against the tint. */
function darken(hex: string, factor = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((n >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Roughly does `text` fit a `w`×`h` box at `font` px? Conservative char estimate. */
function fitsBox(text: string, w: number, h: number, font: number): boolean {
  const charsPerLine = Math.max(1, Math.floor(w / (font * 0.52)));
  const lines = Math.floor(h / (font * 1.35));
  return text.length <= charsPerLine * lines;
}

/** Colored container with a header icon + label — the sample's group boxes.
 *  A collapsed group (semantic zoom) shows a readable card with its annotation. */
export function GroupNodeView({ data, width, height }: NodeProps<GroupRFNode>) {
  const scale = useZoomCounterScale();
  return (
    <div
      style={{
        position: "relative",
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
        <CollapsedCard data={data} scale={scale} width={width} height={height} />
      ) : (
        <>
          <ExpandedHeader data={data} scale={scale} />
          <GroupDescription data={data} />
        </>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

/** Description drawn directly in the group (no box) at the layout-reserved box
 *  geometry, so modules pack around it. L1 shows the short text at the larger
 *  `l1FontSize`; L1.5+ (`showLong`) shows the long text at the smaller `fontSize`.
 *  The box fits both (`descriptionBoxSize`), so neither variant truncates. */
function GroupDescription({ data }: { data: GroupNodeData }) {
  const text =
    (data.showLong ? data.descriptionLong : undefined) ?? data.descriptionShort;
  if (!text || !data.descriptionBox) return null;
  const font = data.showLong ? DESC_BOX.fontSize : DESC_BOX.l1FontSize;
  return (
    <p style={bandDescriptionStyle(darken(data.color), data.descriptionBox, font)} title={text}>
      {text}
    </p>
  );
}

/** Expanded: a quiet header strip; the modules inside carry the detail.
 *  Counter-scales with the camera so the group name stays legible when zoomed
 *  out — the level at which the group, not its modules, is what you read. */
function ExpandedHeader({ data, scale }: { data: GroupNodeData; scale: number }) {
  const glyph = iconGlyph(data.icon);
  return (
    <div style={headerStyle(data.color, scale)}>
      <ToggleButton color={data.color} scale={scale} collapsed={false} />
      {glyph && <span aria-hidden>{glyph}</span>}
      <span>{data.label}</span>
    </div>
  );
}

/** The collapse/expand affordance. Click is handled by the canvas controller,
 *  which detects the `data-group-toggle` target on the node and toggles the
 *  group (single click here, or double-click anywhere on the group). */
function ToggleButton({
  color,
  scale,
  collapsed,
}: {
  color: string;
  scale: number;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      data-group-toggle
      aria-label={collapsed ? "Expand group" : "Collapse group"}
      title={collapsed ? "Expand" : "Collapse"}
      style={toggleButtonStyle(color, scale)}
    >
      {collapsed ? "▸" : "▾"}
    </button>
  );
}

/** Collapsed: the box keeps its size, so its content (not the box) is what
 *  communicates — a big label + a readable, wrapped description. Both font sizes
 *  counter-scale with the camera so they stay legible when zoomed out. */
const L0_DESC_FONT = 14;

function CollapsedCard({
  data,
  scale,
  width,
  height,
}: {
  data: GroupNodeData;
  scale: number;
  width?: number;
  height?: number;
}) {
  const glyph = iconGlyph(data.icon);
  const description = collapsedDescription(data, width, height);
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
    >
      <div style={cardLabelStyle(data.color, scale)}>
        <ToggleButton color={data.color} scale={scale} collapsed />
        {glyph && <span aria-hidden>{glyph}</span>}
        <span>{data.label}</span>
      </div>
      {description && (
        <p style={cardDescriptionStyle(darken(data.color), scale, description.lines)}>
          {description.text}
        </p>
      )}
    </div>
  );
}

/** L0 prefers the long description when it fits the card at a legible font;
 *  otherwise falls back to the short one. Returns the text + line clamp. */
function collapsedDescription(data: GroupNodeData, width?: number, height?: number) {
  const availW = (width ?? PRESETS.collapsedGroupWidth) - 32;
  const availH = (height ?? PRESETS.collapsedGroupHeight) - 56; // label strip + padding
  const lines = Math.max(3, Math.floor(availH / (L0_DESC_FONT * 1.35)));
  if (data.descriptionLong && fitsBox(data.descriptionLong, availW, availH, L0_DESC_FONT)) {
    return { text: data.descriptionLong, lines };
  }
  if (!data.descriptionShort) return null;
  return { text: data.descriptionShort, lines };
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

function toggleButtonStyle(color: string, scale: number) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 16 * scale,
    height: 16 * scale,
    padding: 0,
    border: "none",
    borderRadius: 4 * scale,
    background: "transparent",
    color,
    fontSize: 11 * scale,
    lineHeight: 1,
    cursor: "pointer",
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

function cardDescriptionStyle(color: string, scale: number, lines: number) {
  return {
    margin: 0,
    fontSize: L0_DESC_FONT * scale,
    fontFamily: SANS,
    lineHeight: 1.35,
    color,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
  };
}

/** In-group description, drawn at the layout-reserved box geometry (parent-relative).
 *  Projection has already raised `y` to the highest collision-free spot in the box's
 *  column (ELK centers a short column, so the reserved slot floats mid-group). World
 *  units at `font` (the box is packed to fit both fonts, so it never truncates) —
 *  not counter-scaled. `textAlign: left` overrides React Flow's centered node default. */
function bandDescriptionStyle(
  color: string,
  box: { x: number; y: number; width: number; height: number },
  font: number,
) {
  return {
    position: "absolute" as const,
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    boxSizing: "border-box" as const,
    padding: DESC_BOX.padding,
    margin: 0,
    fontSize: font,
    fontFamily: SANS,
    fontWeight: 500,
    lineHeight: DESC_BOX.lineRatio,
    textAlign: "left" as const,
    color,
    overflow: "hidden",
    pointerEvents: "none" as const,
  };
}
