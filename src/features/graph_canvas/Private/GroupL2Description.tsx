import { useRef } from "react";
import { useStore } from "@xyflow/react";
import type { GroupNodeData } from "../../../domain/graph";
import { DESC_BOX } from "../../../domain/layout";
import { L2ScrollableBody } from "./L2ScrollableBody";
import { MarkdownBody, markdownBodyStyles } from "./MarkdownBody";
import { layoutKeyFromStyles, useL2ClampedLayout, groupDocBorderInset } from "./use-l2-clamped-layout";

interface GroupL2DescriptionProps {
  data: GroupNodeData;
  descColor: string;
  opacity: number;
}

/** L2: scrollable rendered markdown in the layout-reserved description box. */
export function GroupL2Description({ data, descColor, opacity }: GroupL2DescriptionProps) {
  const box = data.descriptionBox;
  const content = data.architectureDocContent;
  const containerRef = useRef<HTMLDivElement>(null);
  const { styles: clampedStyles, inFov } = useL2ClampedLayout(
    containerRef,
    groupDocBorderInset,
  );
  const zoom = useStore((s) => s.transform[2]);
  if (!box || content === undefined) return null;

  const padding = `${DESC_BOX.padding}px`;

  return (
    <>
      <style>{markdownBodyStyles(descColor, zoom)}</style>
      <div
        ref={containerRef}
        className="nodrag"
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          boxSizing: "border-box",
          textAlign: "left",
          background: "#ffffffee",
          border: `${1 / zoom}px solid #e2e8f0`,
          borderLeft: `${3 / zoom}px solid ${descColor}`,
          borderRadius: `${4 / zoom}px`,
          overflow: "hidden",
          opacity,
          zIndex: 5,
        }}
      >
        {inFov && (
          <div style={clampedStyles}>
            <L2ScrollableBody
              zoom={zoom}
              padding={padding}
              gap={`${6 / zoom}px`}
              layoutKey={`${layoutKeyFromStyles(clampedStyles)}|${content.length}`}
              flexChild
            >
              <MarkdownBody source={content} zoom={zoom} />
            </L2ScrollableBody>
          </div>
        )}
      </div>
    </>
  );
}
