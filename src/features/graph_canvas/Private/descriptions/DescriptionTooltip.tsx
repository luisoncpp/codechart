// @Architecture(descriptionShort="Custom screen-space tooltip for long group descriptions")
import { createPortal } from "react-dom";

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MAX_WIDTH = 480;
const EDGE_MARGIN = 8;
const CURSOR_OFFSET = 14;

export interface TooltipAnchor {
  x: number;
  y: number;
}

/** Fixed-position tooltip portaled to `document.body`, so it renders in screen
 *  space (unaffected by the canvas zoom transform) and is never clipped by the
 *  node box. Custom instead of the native `title` tooltip because OS tooltips
 *  truncate long text — a group's full `descriptionLong` must stay readable.
 *  Scrolls internally when the prose exceeds 60% of the viewport height. */
export function DescriptionTooltip({
  text,
  anchor,
}: {
  text: string;
  anchor: TooltipAnchor;
}) {
  return createPortal(
    <div data-description-tooltip role="tooltip" style={tooltipStyle(anchor)}>
      {text}
    </div>,
    document.body,
  );
}

function tooltipStyle(anchor: TooltipAnchor) {
  const left = Math.max(
    EDGE_MARGIN,
    Math.min(anchor.x + CURSOR_OFFSET, window.innerWidth - MAX_WIDTH - EDGE_MARGIN),
  );
  return {
    position: "fixed" as const,
    ...verticalPlacement(anchor),
    left,
    maxWidth: MAX_WIDTH,
    maxHeight: "60vh",
    overflowY: "auto" as const,
    boxSizing: "border-box" as const,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#1e293b",
    fontSize: 13,
    fontFamily: SANS,
    fontWeight: 400,
    lineHeight: 1.45,
    textAlign: "left" as const,
    whiteSpace: "pre-wrap" as const,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
    zIndex: 10000,
    // The cursor moving onto the tooltip must not steal the hover that keeps it open.
    pointerEvents: "none" as const,
  };
}

/** Open downward from the cursor in the top half of the viewport, upward in the
 *  bottom half — so the (up to 60vh) body always has room on its open side. */
function verticalPlacement(anchor: TooltipAnchor) {
  if (anchor.y <= window.innerHeight / 2) {
    return { top: anchor.y + CURSOR_OFFSET };
  }
  return { bottom: window.innerHeight - anchor.y + CURSOR_OFFSET };
}
