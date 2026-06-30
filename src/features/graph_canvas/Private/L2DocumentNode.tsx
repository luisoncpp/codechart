import { useRef } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import type { ModuleNodeData } from "../../../domain/graph";
import { L2Header } from "./L2Header";
import { L2Description, L2CodeBlock } from "./L2Content";
import { L2ScrollableBody } from "./L2ScrollableBody";
import { layoutKeyFromStyles, useL2ClampedLayout } from "./use-l2-clamped-layout";
import { moduleDiffBorder, moduleDiffBorderWidth, moduleDiffOpacity } from "./DiffCodeLines";
import { ConnectionToggle } from "./ConnectionToggle";
import { l2HeatBorder, l2HeatHeaderBar } from "./heat-node-styles";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

interface L2DocumentNodeProps {
  data: ModuleNodeData;
  selected: boolean;
  color: string;
  textColor: string;
}

export function L2DocumentNode({
  data,
  selected,
  color,
}: L2DocumentNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { styles: clampedStyles, inFov } = useL2ClampedLayout(containerRef);
  const zoom = useStore((s) => s.transform[2]);

  const description = data.descriptionLong || data.descriptionShort;
  const bodyPadding = `${Math.max(2, 8 / zoom)}px`;
  const gapSize = `${8 / zoom}px`;
  const diffState = data.diffState;
  const shellOpacity = moduleDiffOpacity(diffState);
  const scrollbarInsetPx = moduleDiffBorderWidth(diffState, /*fallbackPx=*/0);
  const border = moduleDiffBorder(diffState, l2HeatBorder(data, `2px solid ${color}`));
  const heatBar = l2HeatHeaderBar(data);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Consolas, monospace',
        background: "#ffffff",
        borderRadius: 8,
        border,
        outline: selected ? "3px solid #2563eb" : "none",
        overflow: "hidden",
        opacity: shellOpacity,
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <ConnectionToggle disconnected={!!data.disconnected} scale={1 / zoom} />
      {inFov && (
        <div style={clampedStyles}>
          <L2Header label={data.label} color={color} zoom={zoom} />
          {heatBar && <div style={heatBar} />}
          <L2ScrollableBody
            zoom={zoom}
            padding={bodyPadding}
            gap={gapSize}
            layoutKey={layoutKeyFromStyles(clampedStyles)}
            scrollbarInsetPx={scrollbarInsetPx}
            flexChild
          >
            <L2Description description={description} color={color} zoom={zoom} />
            <L2CodeBlock
              snippet={data.snippet}
              path={data.path}
              zoom={zoom}
              fileDiff={data.diffLineDiff}
            />
          </L2ScrollableBody>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
