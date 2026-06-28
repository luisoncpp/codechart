import type { ModuleNodeData } from "../../../domain/graph";
import { countLineDiffStats, type LineDiffStats } from "../../../domain/diff";
import { labelCharsPerLine, MODULE_BOX, wrapIdentifierLines } from "../../../domain/layout";
import { iconGlyph, MODULE_ICON_LAYOUT, moduleIconVisualScale, ICON_EMOJI_BOOST } from "./icon-map";

const DIFF_ADD_COLOR = "#16a34a";
const DIFF_REMOVE_COLOR = "#dc2626";

interface ModuleHeaderProps {
  data: ModuleNodeData;
  textColor: string;
  detail: boolean;
  fontSize: number;
  zoomScale: number;
  boxWidth: number;
}

const labelStyle = (detail: boolean): React.CSSProperties => ({
  overflow: "hidden",
  textAlign: detail ? "left" : "center",
  fontWeight: detail ? "bold" : "normal",
});

const headerStyle = (
  detail: boolean,
  fontSize: number,
  zoomScale: number,
): React.CSSProperties => {
  const gap = detail ? 4 * zoomScale : 4;
  const base = {
    display: "flex" as const,
    alignItems: "center",
    gap,
    flexShrink: 0,
    overflow: detail ? ("visible" as const) : ("hidden" as const),
    fontSize,
    lineHeight: 1.15,
    pointerEvents: "none" as const,
    zIndex: 1,
  };
  return detail
    ? {
        ...base,
        position: "relative" as const,
        padding: `${2 * zoomScale}px ${MODULE_BOX.hPaddingRight * zoomScale}px 0 ${4 * zoomScale}px`,
      }
    : {
        ...base,
        position: "absolute" as const,
        inset: 0,
        justifyContent: "center",
        padding: `0 ${MODULE_BOX.hPaddingRight}px 0 ${MODULE_BOX.hPaddingLeft}px`,
      };
};

export function ModuleHeader({
  data,
  textColor,
  detail,
  fontSize,
  zoomScale,
  boxWidth,
}: ModuleHeaderProps) {
  const glyph = iconGlyph(data.icon);
  const stats = diffStats(data.diffLineDiff);
  const labelLines = wrapIdentifierLines(data.label, labelCharsPerLine(boxWidth, fontSize));
  const iconStyle = detail
    ? {
        fontSize: MODULE_ICON_LAYOUT,
        transform: `scale(${moduleIconVisualScale(zoomScale)})`,
        transformOrigin: "left center" as const,
      }
    : {
        fontSize: Math.min(fontSize, MODULE_ICON_LAYOUT) * ICON_EMOJI_BOOST,
      };
  return (
    <div style={headerStyle(detail, fontSize, zoomScale)}>
      {glyph && (
        <span
          aria-hidden
          style={{
            lineHeight: 1,
            flexShrink: 0,
            display: "inline-block",
            ...iconStyle,
          }}
        >
          {glyph}
        </span>
      )}
      {data.isFacade && (
        <span aria-hidden style={{ color: textColor, fontSize }}>
          ★
        </span>
      )}
      <span style={{ ...labelStyle(detail), whiteSpace: "pre-line" }}>
        {renderLabelWithStats(labelLines, stats)}
      </span>
    </div>
  );
}

function diffStats(fileDiff: ModuleNodeData["diffLineDiff"]): LineDiffStats | null {
  if (!fileDiff) return null;
  const stats = countLineDiffStats(fileDiff);
  if (stats.added === 0 && stats.removed === 0) return null;
  return stats;
}

function renderLabelWithStats(lines: string[], stats: LineDiffStats | null) {
  if (!stats) return lines.join("\n");
  if (lines.length === 0) return <DiffStatsSuffix stats={stats} />;
  const head = lines.slice(0, -1);
  const last = lines[lines.length - 1]!;
  return (
    <>
      {head.length > 0 ? `${head.join("\n")}\n` : null}
      {last}
      <DiffStatsSuffix stats={stats} />
    </>
  );
}

function DiffStatsSuffix({ stats }: { stats: LineDiffStats }) {
  return (
    <>
      {stats.added > 0 && (
        <>
          {" "}
          <span style={{ color: DIFF_ADD_COLOR }}>+{stats.added}</span>
        </>
      )}
      {stats.removed > 0 && (
        <>
          {" "}
          <span style={{ color: DIFF_REMOVE_COLOR }}>-{stats.removed}</span>
        </>
      )}
    </>
  );
}
