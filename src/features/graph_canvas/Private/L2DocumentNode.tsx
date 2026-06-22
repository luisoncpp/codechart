import { useState, useRef, useLayoutEffect } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import type { ModuleNodeData } from "../../../domain/graph";
import { L2Header } from "./L2Header";
import { L2Description, L2CodeBlock } from "./L2Content";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;

interface L2DocumentNodeProps {
  data: ModuleNodeData;
  selected: boolean;
  color: string;
  textColor: string;
}

function calculateVisibleBounds(
  nodeEl: HTMLDivElement,
  parentEl: Element,
  zoom: number,
) {
  const nodeRect = nodeEl.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();

  const nodeTopInScreen = nodeRect.top - parentRect.top;
  const nodeBottomInScreen = nodeRect.bottom - parentRect.top;
  const nodeLeftInScreen = nodeRect.left - parentRect.left;
  const nodeRightInScreen = nodeRect.right - parentRect.left;

  const verticalOverlap = nodeBottomInScreen > 0 && nodeTopInScreen < parentRect.height;
  const horizontalOverlap = nodeRightInScreen > 0 && nodeLeftInScreen < parentRect.width;

  if (!verticalOverlap || !horizontalOverlap) {
    return null;
  }

  const visibleTop = Math.max(0, nodeTopInScreen);
  const visibleBottom = Math.min(parentRect.height, nodeBottomInScreen);

  return {
    top: (visibleTop - nodeTopInScreen) / zoom,
    height: (visibleBottom - visibleTop) / zoom,
  };
}

function useClampedLayout(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [state, setState] = useState<{ styles: React.CSSProperties; inFov: boolean }>({
    styles: {
      position: "absolute",
      top: 0,
      height: "100%",
      left: 0,
      right: 0,
      display: "flex",
      flexDirection: "column",
    },
    inFov: false,
  });

  const zoom = useStore((s) => s.transform[2]);
  const tx = useStore((s) => s.transform[0]);
  const ty = useStore((s) => s.transform[1]);
  const w = useStore((s) => s.width);
  const h = useStore((s) => s.height);

  useLayoutEffect(/*updateBounds*/ () => {
    const el = containerRef.current;
    if (!el) return;
    const parentEl = document.querySelector(".react-flow");
    if (!parentEl) return;

    const bounds = calculateVisibleBounds(el, parentEl, zoom);
    if (!bounds) {
      setState({
        styles: {
          position: "absolute",
          top: 0,
          height: "100%",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
        },
        inFov: false,
      });
      return;
    }

    setState({
      styles: {
        position: "absolute",
        top: bounds.top,
        height: bounds.height,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
      },
      inFov: true,
    });
  }, [zoom, tx, ty, w, h]);

  return state;
}

export function L2DocumentNode({
  data,
  selected,
  color,
}: L2DocumentNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { styles: clampedStyles, inFov } = useClampedLayout(containerRef);
  const zoom = useStore((s) => s.transform[2]);

  const description = data.descriptionLong || data.descriptionShort;
  const bodyPadding = `${Math.max(2, 8 / zoom)}px`;
  const gapSize = `${8 / zoom}px`;

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
        border: `2px solid ${color}`,
        outline: selected ? "3px solid #2563eb" : "none",
        overflow: "hidden",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      {inFov && (
        <div style={clampedStyles}>
          <L2Header label={data.label} color={color} zoom={zoom} />
          <div
            className="nowheel nodrag l2-scrollable"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: bodyPadding,
              display: "flex",
              flexDirection: "column",
              gap: gapSize,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(0, 0, 0, 0.15) transparent",
              ["--l2-scrollbar-width" as any]: `${5 / zoom}px`,
            }}
          >
            <L2Description description={description} color={color} zoom={zoom} />
            <L2CodeBlock snippet={data.snippet} path={data.path} zoom={zoom} />
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
