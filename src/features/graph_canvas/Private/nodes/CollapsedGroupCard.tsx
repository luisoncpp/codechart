// @Architecture(descriptionShort="L0 collapsed group card: fitted title over a fitted description")
import type { GroupNodeData } from "../../../../domain/projection";
import { iconFontSize, iconGlyph } from "./icon-map";
import { GroupToggleButton } from "./GroupToggleButton";
import type { groupTextColors } from "./heat-node-styles";
import { groupLabelOpacity } from "./module-diff-style";
import { darkenHex } from "./color-utils";
import { collapsedDescription, collapsedLabelLayout } from "../descriptions/collapsed-description";
import { renderInlineMarkdown } from "../descriptions/render-markdown";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Collapsed: the box keeps its size, so its content (not the box) is what
 *  communicates — a big label + a readable, wrapped description. Both font sizes
 *  counter-scale with the camera so they stay legible when zoomed out. */
export function CollapsedGroupCard({
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
        <GroupToggleButton color={text.control} scale={label.chromeScale} collapsed />
        <div style={{ ...cardLabelTextStyle(label), opacity: groupLabelOpacity(data) }}>
          {glyph && (
            <span
              aria-hidden
              style={{ fontSize: iconFontSize(18, label.chromeScale), lineHeight: 1, flexShrink: 0 }}
            >
              {glyph}
            </span>
          )}
          <span title={data.label} style={cardLabelValueStyle(label.lines)}>{data.label}</span>
        </div>
      </div>
      {description && (
        <p
          className="group-collapsed-desc"
          style={{
            ...cardDescriptionStyle(descColor, description),
            opacity: groupLabelOpacity(data),
          }}
          dangerouslySetInnerHTML={{
            __html: renderInlineMarkdown(description.text),
          }}
        />
      )}
    </div>
  );
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
 *  `minWidth: 0` lets the flex item shrink instead of pushing past the card edge. */
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

/** One fitted line ellipsizes; a wrapped title clamps to the fitted count
 *  (the parent's `nowrap` must be undone, or the span inherits it). */
function cardLabelValueStyle(lines: number) {
  if (lines === 1) {
    return { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
  }
  return {
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "normal",
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
  } as const;
}

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
