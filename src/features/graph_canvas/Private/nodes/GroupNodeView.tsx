// @Architecture(descriptionShort="Renders group boundaries, titles, and descriptions")
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GroupRFNode, GroupNodeData } from "../../../../domain/projection";
import { expandedHeaderScale } from "../../../../domain/layout";
import { iconFontSize, iconGlyph } from "./icon-map";
import { ConnectionToggle } from "./ConnectionToggle";
import { LocBadge } from "./LocBadge";
import { GroupToggleButton } from "./GroupToggleButton";
import { CollapsedGroupCard } from "./CollapsedGroupCard";
import { GroupL2Description } from "../descriptions/GroupL2Description";
import { useZoomCounterScale } from "./use-zoom-counter-scale";
import { groupShellStyle, groupTextColors } from "./heat-node-styles";
import { groupLabelOpacity } from "./module-diff-style";
import { darkenHex } from "./color-utils";
import { GroupDescription } from "../descriptions/GroupDescription";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

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
        <CollapsedGroupCard data={data} text={text} scale={scale} width={width} height={height} />
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
      <GroupToggleButton color={text.control} scale={scale} collapsed={false} />
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
