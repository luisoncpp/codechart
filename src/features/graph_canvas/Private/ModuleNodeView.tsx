// @Architecture(descriptionShort="Renders module cards showing name, symbols, and snippets")
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModuleRFNode } from "../../../domain/graph";
import { diffStatsSuffixLength, countLineDiffStats } from "../../../domain/diff";
import { fitModuleHeaderFontSize, MODULE_BOX } from "../../../domain/layout";
import { ConnectionToggle } from "./ConnectionToggle";
import { L2DocumentNode } from "./L2DocumentNode";
import { ModuleHeader } from "./ModuleHeader";
import { moduleDiffBorder, moduleDiffOpacity } from "./DiffCodeLines";
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

function moduleHeaderFontSize(
  data: ModuleRFNode["data"],
  detail: boolean,
  width: number,
  height: number,
): number {
  const suffixLen = data.diffLineDiff
    ? diffStatsSuffixLength(countLineDiffStats(data.diffLineDiff))
    : 0;
  return fitModuleHeaderFontSize(
    data.label,
    suffixLen,
    width,
    height,
    detail,
  );
}

/** Module container: label-only at L1; symbol children appear inside at L1.5+. */
export function ModuleNodeView({ data, selected, width, height }: NodeProps<ModuleRFNode>) {
  const color = data.color ?? "#64748b";
  const textColor = darken(color);
  const zoomScale = useZoomCounterScale();
  const boxW = width ?? MODULE_BOX.minWidth;
  const boxH = height ?? MODULE_BOX.minHeight;

  if (data.snippet !== undefined) {
    return <L2DocumentNode data={data} selected={selected} color={color} textColor={textColor} />;
  }

  const detail = data.showSymbols || !!data.snippet;
  const fontSize = moduleHeaderFontSize(data, detail, boxW, boxH);
  const cardOpts = {
    color,
    textColor,
    isFacade: data.isFacade,
    selected,
    detail,
    diffState: data.diffState,
  };
  return (
    <div style={cardStyle(cardOpts)} title={data.descriptionShort ?? data.label}>
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <ConnectionToggle disconnected={!!data.disconnected} scale={zoomScale} />
      {data.snippet && <Snippet source={data.snippet} />}
      <ModuleHeader
        data={data}
        textColor={textColor}
        detail={detail}
        fontSize={fontSize}
        zoomScale={zoomScale}
        boxWidth={boxW}
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
  diffState?: "affected" | "deleted" | "unchanged";
}

function cardStyle({
  color,
  textColor,
  isFacade,
  selected,
  detail,
  diffState,
}: CardStyleOptions) {
  const diffBorder = moduleDiffBorder(diffState, `${isFacade ? 2 : 1}px solid ${color}`);
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
    border: diffBorder,
    outline: selected ? "2px solid #2563eb" : "none",
    overflow: "hidden",
    opacity: moduleDiffOpacity(diffState),
  };
}
