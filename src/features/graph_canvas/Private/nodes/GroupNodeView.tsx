// @Architecture(descriptionShort="Renders group boundaries, titles, and descriptions")
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GroupRFNode, GroupNodeData } from "../../../../domain/graph";
import { UNCHANGED_MODULE_DIFF_OPACITY } from "../../../../domain/diff";
import { expandedHeaderScale } from "../../../../domain/layout";
import { iconFontSize, iconGlyph } from "./icon-map";
import { ConnectionToggle } from "./ConnectionToggle";
import { ChevronIcon } from "./ChevronIcon";
import { LocBadge } from "./LocBadge";
import { GroupL2Description } from "../descriptions/GroupL2Description";
import { useZoomCounterScale } from "./use-zoom-counter-scale";
import { groupShellStyle, groupTextColors } from "./heat-node-styles";
import { darkenHex } from "./color-utils";
import { collapsedDescription, collapsedLabelLayout } from "../descriptions/collapsed-description";
import { GroupDescription } from "../descriptions/GroupDescription";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

function groupLabelOpacity(data: GroupNodeData): number {
  return data.diffVisualizing ? UNCHANGED_MODULE_DIFF_OPACITY : 1;
}

/** Colored container with a header icon + label — the sample's group boxes.
 *  A collapsed group (semantic zoom) shows a readable card with its annotation. */
export function GroupNodeView({ data, width, height }: NodeProps<GroupRFNode>) {
  const scale = useZoomCounterScale();
  const shell = groupShellStyle(data);
  const text = groupTextColors(data);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        borderRadius: 10,
        ...shell,
      }}
    >
      {/* Invisible handles so a collapsed group can be an edge endpoint (L0
          group→group edges). EdgeLayer ignores their position. */}
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <ConnectionToggle disconnected={!!data.disconnected} scale={scale} />
      {!!data.reviewNoteCount && <button type="button" data-review-note-badge style={{ position: "absolute", right: 8 * scale, top: 6 * scale, zIndex: 3, border: "1px solid #7c3aed", borderRadius: 999, background: "#f3e8ff", color: "#5b21b6", fontSize: 9 * scale, cursor: "pointer" }}>{data.reviewNoteCount}</button>}
      {data.collapsed ? (
        <CollapsedCard data={data} text={text} scale={scale} width={width} height={height} />
      ) : (
        <>
          {/* Clamped: the layout reserved the title obstacle at this max scale;
              growing past it would slide the title under sibling subgroups. */}
          <ExpandedHeader data={data} text={text} scale={expandedHeaderScale(scale)} />
          {data.architectureDocContent !== undefined ? (
            <GroupL2Description
              data={data}
              descColor={data.heatmapActive ? text.description : darkenHex(text.description)}
              opacity={groupLabelOpacity(data)}
            />
          ) : (
            <GroupDescription
              data={data}
              descColor={data.heatmapActive ? text.description : darkenHex(text.description)}
            />
          )}
        </>
      )}
      <LocBadge loc={data.loc} scale={scale} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

/** Expanded: a quiet header strip; the modules inside carry the detail.
 *  Counter-scales with the camera so the group name stays legible when zoomed
 *  out — the level at which the group, not its modules, is what you read. */
function ExpandedHeader({
  data,
  text,
  scale,
}: {
  data: GroupNodeData;
  text: ReturnType<typeof groupTextColors>;
  scale: number;
}) {
  const glyph = iconGlyph(data.icon);
  return (
    <div style={headerStyle(text.label, scale)}>
      <ToggleButton color={text.control} scale={scale} collapsed={false} />
      <div style={{ ...headerLabelStyle(scale), opacity: groupLabelOpacity(data) }}>
        {glyph && (
          <span aria-hidden style={{ fontSize: iconFontSize(14, scale), lineHeight: 1, flexShrink: 0 }}>
            {glyph}
          </span>
        )}
        <span>{data.label}</span>
      </div>
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
      <ChevronIcon
        direction={collapsed ? "right" : "down"}
        size={18 * scale}
        color={color}
      />
    </button>
  );
}

/** Collapsed: the box keeps its size, so its content (not the box) is what
 *  communicates — a big label + a readable, wrapped description. Both font sizes
 *  counter-scale with the camera so they stay legible when zoomed out. */
function CollapsedCard({
  data,
  text,
  scale,
  width,
  height,
}: {
  data: GroupNodeData;
  text: ReturnType<typeof groupTextColors>;
  scale: number;
  width?: number;
  height?: number;
}) {
  const glyph = iconGlyph(data.icon);
  const label = collapsedLabelLayout(data, scale, { width, height });
  const description = collapsedDescription(data, scale, { width, height });
  const descColor = data.heatmapActive ? text.description : darkenHex(text.description);
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
      <div style={cardLabelStyle(text.label, label.chromeScale, label.width)}>
        <ToggleButton color={text.control} scale={label.chromeScale} collapsed />
        <div style={{ ...cardLabelTextStyle(label), opacity: groupLabelOpacity(data) }}>
          {glyph && (
            <span
              aria-hidden
              style={{ fontSize: iconFontSize(18, label.chromeScale), lineHeight: 1, flexShrink: 0 }}
            >
              {glyph}
            </span>
          )}
          <span title={data.label} style={cardLabelValueStyle}>{data.label}</span>
        </div>
      </div>
      {description && (
        <p
          style={{
            ...cardDescriptionStyle(descColor, description),
            opacity: groupLabelOpacity(data),
          }}
        >
          {description.text}
        </p>
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
    color,
  };
}

function headerLabelStyle(scale: number) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6 * scale,
    fontSize: 12 * scale,
    fontFamily: SANS,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  };
}

function toggleButtonStyle(color: string, scale: number) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24 * scale,
    height: 24 * scale,
    padding: 0,
    border: "none",
    borderRadius: 4 * scale,
    background: "transparent",
    color,
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
  };
}

function cardLabelStyle(color: string, scale: number, width: number) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6 * scale,
    width,
    maxWidth: "100%",
    color,
  };
}

/** Renders the title at the font `collapsedLabelLayout` fitted to the card —
 *  a fixed counter-scaled 15px overflows any card smaller than the title.
 *  `overflowWrap` backs the floor-font force-wrap; `minWidth: 0` lets the
 *  flex item actually wrap instead of pushing past the card edge. */
function cardLabelTextStyle(label: { font: number; chromeScale: number }) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6 * label.chromeScale,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap" as const,
    fontSize: label.font,
    fontFamily: SANS,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    lineHeight: 1.1,
  };
}

const cardLabelValueStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

/** Renders at the exact region `collapsedDescription` measured — width and font
 *  must stay in the same world units the fit math used, or the wrap disagrees
 *  (an unscaled cap turns into a sliver once the font counter-scales). */
function cardDescriptionStyle(
  color: string,
  region: { lines: number; width: number; font: number; truncate: boolean },
) {
  return {
    margin: 0,
    fontSize: region.font,
    fontFamily: SANS,
    lineHeight: 1.35,
    color,
    overflow: "hidden",
    ...(region.truncate
      ? {
          display: "-webkit-box",
          WebkitLineClamp: region.lines,
          WebkitBoxOrient: "vertical" as const,
        }
      : {}),
    width: region.width,
    maxWidth: "100%",
  };
}
