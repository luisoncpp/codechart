// @Architecture(descriptionShort="In-group description text with a long-description hover tooltip at L1")
import { useEffect, useState } from "react";
import { useStore, useStoreApi } from "@xyflow/react";
import type { GroupNodeData } from "../../../../domain/graph";
import { UNCHANGED_MODULE_DIFF_OPACITY } from "../../../../domain/diff";
import { DESC_BOX, fitDescriptionFontSize } from "../../../../domain/layout";
import { DescriptionTooltip, type TooltipAnchor } from "./DescriptionTooltip";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Description drawn directly in the group (no box) at the layout-reserved box
 *  geometry, so modules pack around it. L1 shows the short text at the larger
 *  `l1FontSize`; L1.5+ (`showLong`) shows the long text at the smaller `fontSize`.
 *  The box fits both (`descriptionBoxSize`), so neither variant truncates.
 *  At L1 (short text shown) hovering the description opens a custom tooltip
 *  with the full `descriptionLong` — see `DescriptionTooltip`. */
export function GroupDescription({
  data,
  descColor,
}: {
  data: GroupNodeData;
  descColor: string;
}) {
  const [anchor, setAnchor] = useState<(TooltipAnchor & { viewport: string }) | null>(null);
  const rfStore = useStoreApi();
  const showingLong = !!(data.showLong && data.descriptionLong);
  const text = (showingLong ? data.descriptionLong : undefined) ?? data.descriptionShort;
  // Redundant when the displayed text already is the long one: at L1.5+
  // (`showingLong`) it's inline, and a long identical to the short adds nothing.
  // Whitespace-insensitive: the two can differ only in newlines vs spaces
  // (e.g. a CRLF-authored body) yet render identically.
  const redundant =
    showingLong || (!!text && collapseWhitespace(data.descriptionLong ?? "") === collapseWhitespace(text));
  const tooltipText = redundant ? undefined : data.descriptionLong;
  if (!text || !data.descriptionBox) return null;
  const { width, height } = data.descriptionBox;
  const font = showingLong
    ? DESC_BOX.fontSize
    : fitDescriptionFontSize(text, width, height);
  return (
    <>
      <p
        style={{
          ...bandDescriptionStyle(descColor, data.descriptionBox, font),
          // Hoverable only when a tooltip exists; otherwise stay inert as before.
          pointerEvents: tooltipText ? "auto" : "none",
          opacity: data.diffVisualizing ? UNCHANGED_MODULE_DIFF_OPACITY : 1,
        }}
        onMouseEnter={
          tooltipText
            ? /*openTooltipAtCursor*/ (e) =>
                setAnchor({
                  x: e.clientX,
                  y: e.clientY,
                  viewport: viewportKey(rfStore.getState().transform),
                })
            : undefined
        }
        onMouseLeave={tooltipText ? /*closeTooltip*/ () => setAnchor(null) : undefined}
      >
        {text}
      </p>
      {tooltipText && anchor && (
        <>
          <DescriptionTooltip text={tooltipText} anchor={anchor} />
          <DismissOnViewportMove
            openedAt={anchor.viewport}
            onMove={/*closeTooltip*/ () => setAnchor(null)}
          />
        </>
      )}
    </>
  );
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function viewportKey(transform: readonly [number, number, number]): string {
  return transform.join(",");
}

/** Mounted only while the tooltip is open, so the per-frame viewport
 *  subscription costs nothing the rest of the time. Panning (or zooming) the
 *  canvas moves the description out from under the fixed-position tooltip, so
 *  any viewport change since open dismisses it. */
function DismissOnViewportMove({
  openedAt,
  onMove,
}: {
  openedAt: string;
  onMove: () => void;
}) {
  const viewport = useStore((s) => viewportKey(s.transform));
  useEffect(
    /*dismissWhenViewportChanges*/ () => {
      if (viewport !== openedAt) onMove();
    },
    [viewport, openedAt, onMove],
  );
  return null;
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
    display: "flex",
    alignItems: "center",
  };
}
