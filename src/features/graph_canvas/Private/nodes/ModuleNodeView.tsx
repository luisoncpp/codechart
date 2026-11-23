// @Architecture(descriptionShort="Renders module cards showing name, symbols, and snippets")

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { ModuleRFNode } from "../../../../domain/projection";

import { diffStatsSuffixLength, countLineDiffStats } from "../../../../domain/diff";

import { fitModuleHeaderFontSize, MODULE_BOX } from "../../../../domain/layout";

import { ConnectionToggle } from "./ConnectionToggle";

import { DiffReviewToggle } from "./DiffReviewToggle";

import { L2DocumentNode } from "../l2/L2DocumentNode";

import { ModuleHeader } from "./ModuleHeader";

import { ModuleSymbolBoxes } from "./ModuleSymbolBoxes";

import { LocBadge } from "./LocBadge";

import { moduleDiffBorder, moduleDiffOpacity } from "./module-diff-style";

import { counterScaleFromZoom, useCanvasZoom } from "./use-zoom-counter-scale";

import {
  l15HeatBarStyle,
  moduleCardBackground,
  moduleCardBorder,
  moduleLabelColor,
} from "./heat-node-styles";
import { darkenHex } from "./color-utils";

import { renderInlineMarkdown } from "../descriptions/render-markdown";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

const SNIPPET_LINES = 12;

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

  const textColor = darkenHex(color);

  const zoom = useCanvasZoom();
  const zoomScale = counterScaleFromZoom(zoom);

  const boxW = width ?? MODULE_BOX.minWidth;

  const boxH = height ?? MODULE_BOX.minHeight;



  if (data.snippet !== undefined) {

    return <L2DocumentNode data={data} selected={selected} color={color} textColor={textColor} boxWidth={boxW} boxHeight={boxH} />;

  }



  const detail = data.showSymbols || !!data.snippet;

  const fontSize = moduleHeaderFontSize(data, detail, boxW, boxH);

  const cardOpts = {
    data,
    color,
    textColor: moduleLabelColor(data, textColor),
    isFacade: data.isFacade,
    selected,
    detail,
    diffState: data.diffState,
    diffReviewed: !!data.diffReviewed,
    counterScale: zoomScale,
  };

  return (

    <div style={cardStyle(cardOpts)} title={data.descriptionShort ?? data.label}>

      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />

      <ConnectionToggle disconnected={!!data.disconnected} scale={zoomScale} />
      {(data.diffState === "affected" || data.diffState === "deleted") && (
        <DiffReviewToggle reviewed={!!data.diffReviewed} scale={zoomScale} boxWidth={boxW} boxHeight={boxH} />
      )}
      {!!data.reviewNoteCount && <button type="button" data-review-note-badge style={reviewBadgeStyle(zoomScale)}>{data.reviewNoteCount}</button>}
      {data.blastDepth !== undefined && (
        <span data-blast-depth-badge style={blastBadgeStyle(zoomScale, data.blastDepth)}>
          {data.blastDepth === 0 ? "SRC" : `R+${data.blastDepth}`}
        </span>
      )}

      {detail && <div style={l15HeatBarStyle(data)} />}

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
        <div
          style={{ ...DESCRIPTION_STYLE, color: textColor }}
          dangerouslySetInnerHTML={{
            __html: renderInlineMarkdown(data.descriptionShort),
          }}
        />
      )}

      {data.showSymbols && data.symbols && (
        <ModuleSymbolBoxes symbols={data.symbols} moduleData={data} color={color} />
      )}

      <LocBadge loc={data.loc} scale={zoomScale} />

      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

    </div>

  );

}

function reviewBadgeStyle(scale: number): React.CSSProperties {
  return { position: "absolute", top: 3 * scale, right: 3 * scale, zIndex: 3, minWidth: 16 * scale, border: "1px solid #7c3aed", borderRadius: 999, background: "#f3e8ff", color: "#5b21b6", fontSize: 9 * scale, cursor: "pointer" };
}

function blastBadgeStyle(scale: number, depth: number): React.CSSProperties {
  const bg = depth === 0 ? "#fef3c7" : depth === 1 ? "#ffedd5" : "#fef9c3";
  const border = depth === 0 ? "#d97706" : depth === 1 ? "#ea580c" : "#ca8a04";
  return {
    position: "absolute",
    bottom: 3 * scale,
    left: 3 * scale,
    zIndex: 3,
    padding: `0 ${4 * scale}px`,
    border: `1px solid ${border}`,
    borderRadius: 999,
    background: bg,
    color: "#9a3412",
    fontSize: 8 * scale,
    fontWeight: 700,
    pointerEvents: "none",
  };
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
  data: ModuleRFNode["data"];
  color: string;
  textColor: string;
  isFacade: boolean;
  selected: boolean;
  detail: boolean;
  diffState?: "affected" | "deleted" | "unchanged";
  diffReviewed?: boolean;
  counterScale: number;
}

function cardStyle({
  data,
  color,
  textColor,
  isFacade,
  selected,
  detail,
  diffState,
  diffReviewed,
  counterScale,
}: CardStyleOptions) {
  const defaultBorder = moduleCardBorder(data, color, isFacade);
  const diffBorder = moduleDiffBorder(diffState, defaultBorder, counterScale);
  const baseOpacity = moduleDiffOpacity(diffState, /*reviewed=*/diffReviewed);
  const opacity =
    data.spotlightState === "active" || data.blastDepth !== undefined
      ? 1
      : data.spotlightState === "dimmed"
        ? Math.min(baseOpacity, diffState === "unchanged" ? 0.2 : 0.45)
        : baseOpacity;
  const outline = selected
    ? "2px solid #2563eb"
    : data.spotlightState === "active"
      ? "2px solid #7c3aed"
      : data.blastDepth !== undefined
        ? "2px solid #ea580c"
        : "none";

  return {
    position: "relative" as const,
    width: "100%",
    height: "100%",
    boxSizing: "border-box" as const,
    fontFamily:
      'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
    color: textColor,
    background: moduleCardBackground(data, color, detail),
    borderRadius: 6,
    border: diffBorder,
    outline,
    overflow: "hidden",
    opacity,
  };
}

