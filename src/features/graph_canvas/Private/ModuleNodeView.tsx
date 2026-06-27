// @Architecture(descriptionShort="Renders module cards showing name, symbols, and snippets")
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModuleRFNode, ModuleNodeData } from "../../../domain/graph";
import { fitLabelFontSize, labelCharsPerLine, MODULE_BOX, wrapIdentifierLines } from "../../../domain/layout";
import { iconGlyph, MODULE_ICON_LAYOUT, moduleIconVisualScale, ICON_EMOJI_BOOST } from "./icon-map";
import { ConnectionToggle } from "./ConnectionToggle";
import { L2DocumentNode } from "./L2DocumentNode";
import { useZoomCounterScale } from "./use-zoom-counter-scale";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;
const SNIPPET_LINES = 12;

/** Darken a #rrggbb color toward black so label text reads clearly. */
function darken(hex: string, factor = 0.55): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(((n >> shift) & 0xff) * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

const DESCRIPTION_STYLE: React.CSSProperties = {
  fontSize: 8,
  lineHeight: "10px",
  padding: "2px 6px 4px",
  opacity: 0.8,
  fontStyle: "italic",
  whiteSpace: "normal",
  wordBreak: "break-word",
  borderBottom: "1px dashed rgba(0,0,0,0.1)",
  position: "relative",
  zIndex: 1,
};

/** Module container: label-only at L1; symbol children appear inside at L1.5+. */
export function ModuleNodeView({ data, selected, width, height }: NodeProps<ModuleRFNode>) {
  const color = data.color ?? "#64748b";
  const textColor = darken(color);

  if (data.snippet !== undefined) {
    return <L2DocumentNode data={data} selected={selected} color={color} textColor={textColor} />;
  }

  const detail = data.showSymbols || !!data.snippet;
  const fontSize = detail
    ? 9
    : fitLabelFontSize(data.label, width ?? MODULE_BOX.minWidth, height ?? MODULE_BOX.minHeight);
  const zoomScale = useZoomCounterScale();

  const cardOpts = { color, textColor, isFacade: data.isFacade, selected, detail };
  return (
    <div style={cardStyle(cardOpts)} title={data.descriptionShort ?? data.label}>
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <ConnectionToggle disconnected={!!data.disconnected} scale={zoomScale} />
      {data.snippet && <Snippet source={data.snippet} />}
      <Header
        data={data}
        textColor={textColor}
        detail={detail}
        fontSize={fontSize}
        zoomScale={zoomScale}
        boxWidth={width ?? MODULE_BOX.minWidth}
      />
      {data.showSymbols && data.descriptionShort && (
        <div style={{ ...DESCRIPTION_STYLE, color: textColor }}>
          {data.descriptionShort}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
interface HeaderProps {
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

/** Label scales with the box (world units, no camera counter-scale): the box is
 *  laid out to fit this size, so the text never overflows it as you zoom. */
function Header({ data, textColor, detail, fontSize, zoomScale, boxWidth }: HeaderProps) {
  const glyph = iconGlyph(data.icon);
  const labelLines = wrapIdentifierLines(
    data.label,
    labelCharsPerLine(boxWidth, fontSize),
  );
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
        {labelLines.join("\n")}
      </span>
    </div>
  );
}

function Snippet({ source }: { source: string }) {
  const text = source.split("\n").slice(0, SNIPPET_LINES).join("\n");
  return (
    <pre
      style={{
        position: "absolute",
        inset: 0,
        margin: 0,
        padding: "22px 6px 6px",
        fontSize: 8,
        lineHeight: 1.35,
        color: "#1e293b",
        background: "#ffffffcc",
        border: "none",
        overflow: "hidden",
        whiteSpace: "pre",
        pointerEvents: "none",
      }}
    >
      {text}
    </pre>
  );
}

interface CardStyleOptions {
  color: string;
  textColor: string;
  isFacade: boolean;
  selected: boolean;
  detail: boolean;
}

function cardStyle({ color, textColor, isFacade, selected, detail }: CardStyleOptions) {
  return {
    position: "relative" as const,
    width: "100%",
    height: "100%",
    boxSizing: "border-box" as const,
    fontFamily:
      'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
    color: textColor,
    background: detail ? `${color}0d` : `${color}1a`,
    borderRadius: 6,
    border: `${isFacade ? 2 : 1}px solid ${color}`,
    outline: selected ? "2px solid #2563eb" : "none",
    overflow: "hidden",
  };
}
