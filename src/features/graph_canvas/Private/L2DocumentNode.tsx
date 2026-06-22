import { useState, useRef, useLayoutEffect } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import type { ModuleNodeData } from "../../../domain/graph";
import { L2Header } from "./L2Header";
import { L2Description, L2CodeBlock } from "./L2Content";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;
/** Visible thumb width on screen (px); divided by canvas zoom inside the node. */
const SCROLLBAR_SCREEN_PX = 6;
/** Wider hit target so the thumb is easy to grab and drag. */
const SCROLLBAR_HIT_SCREEN_PX = 12;
const MIN_THUMB_SCREEN_PX = 24;

interface L2ScrollableBodyProps {
  zoom: number;
  padding: string;
  gap: string;
  children: React.ReactNode;
}

function L2ScrollableBody({ zoom, padding, gap, children }: L2ScrollableBodyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, show: false });
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const sync = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight + 1) {
        setThumb({ top: 0, height: 0, show: false });
        return;
      }
      const minHeight = MIN_THUMB_SCREEN_PX / zoom;
      const height = Math.max(minHeight, (clientHeight / scrollHeight) * clientHeight);
      const track = clientHeight - height;
      const top = track * (scrollTop / (scrollHeight - clientHeight));
      setThumb({ top, height, show: true });
    };

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [zoom, children]);

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const { scrollHeight, clientHeight } = el;
    const minHeight = MIN_THUMB_SCREEN_PX / zoom;
    const thumbHeight = Math.max(minHeight, (clientHeight / scrollHeight) * clientHeight);
    const track = clientHeight - thumbHeight;
    const scrollRange = scrollHeight - clientHeight;
    if (track <= 0 || scrollRange <= 0) return;
    const deltaY = (e.clientY - dragRef.current.startY) / zoom;
    el.scrollTop = dragRef.current.startScrollTop + deltaY * (scrollRange / track);
  };

  const endThumbDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        ref={scrollRef}
        className="nowheel nodrag l2-scrollable"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding,
          display: "flex",
          flexDirection: "column",
          gap,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {children}
      </div>
      {thumb.show && (
        <div
          className="nodrag"
          style={{
            position: "absolute",
            top: thumb.top,
            right: 0,
            width: SCROLLBAR_HIT_SCREEN_PX / zoom,
            height: thumb.height,
            display: "flex",
            justifyContent: "flex-end",
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
          onPointerDown={onThumbPointerDown}
          onPointerMove={onThumbPointerMove}
          onPointerUp={endThumbDrag}
          onPointerCancel={endThumbDrag}
        >
          <div
            aria-hidden
            style={{
              width: SCROLLBAR_SCREEN_PX / zoom,
              height: "100%",
              borderRadius: 9999,
              background: dragging ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.2)",
            }}
          />
        </div>
      )}
    </div>
  );
}

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
  }, [containerRef, zoom, tx, ty, w, h]);

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
          <L2ScrollableBody zoom={zoom} padding={bodyPadding} gap={gapSize}>
            <L2Description description={description} color={color} zoom={zoom} />
            <L2CodeBlock snippet={data.snippet} path={data.path} zoom={zoom} />
          </L2ScrollableBody>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
