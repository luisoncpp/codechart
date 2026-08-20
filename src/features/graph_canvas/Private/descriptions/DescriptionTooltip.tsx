// @Architecture(descriptionShort="Custom screen-space tooltip for long group descriptions with Markdown support")
import { createPortal } from "react-dom";
import { renderBlockMarkdown } from "./render-markdown";

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
  const html = renderBlockMarkdown(text);
  return createPortal(
    <>
      <style>{tooltipMarkdownStyles}</style>
      <div
        data-description-tooltip
        role="tooltip"
        style={tooltipStyle(anchor)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>,
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
    whiteSpace: "normal" as const,
    wordBreak: "break-word" as const,
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

const tooltipMarkdownStyles = `
  [data-description-tooltip] p {
    margin: 0 0 6px 0;
  }
  [data-description-tooltip] p:last-child {
    margin: 0;
  }
  [data-description-tooltip] code {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, monospace;
    font-size: 12px;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
    color: #0f172a;
  }
  [data-description-tooltip] pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 6px 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0 0 6px 0;
    font-size: 12px;
  }
  [data-description-tooltip] pre code {
    background: transparent;
    padding: 0;
  }
  [data-description-tooltip] ul, [data-description-tooltip] ol {
    margin: 0 0 6px 0;
    padding-left: 18px;
  }
  [data-description-tooltip] li {
    margin-bottom: 2px;
  }
  [data-description-tooltip] h1, [data-description-tooltip] h2, [data-description-tooltip] h3 {
    font-size: 14px;
    font-weight: 700;
    margin: 4px 0 4px 0;
    color: #0f172a;
  }
  [data-description-tooltip] a, [data-description-tooltip] a.hl-wiki-link {
    color: #2563eb;
    text-decoration: none;
  }
`;

