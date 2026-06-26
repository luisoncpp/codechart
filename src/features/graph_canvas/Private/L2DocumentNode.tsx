import { useState, useRef, useLayoutEffect } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import type { ModuleNodeData } from "../../../domain/graph";
import { L2Header } from "./L2Header";
import { L2Description, L2CodeBlock } from "./L2Content";
import { ConnectionToggle } from "./ConnectionToggle";

const HANDLE_STYLE = { opacity: 0, width: 1, height: 1 } as const;
/** Visible thumb thickness on screen (px); divided by canvas zoom inside the node. */
const SCROLLBAR_SCREEN_PX = 6;
/** Wider hit target so the thumb is easy to grab and drag. */
const SCROLLBAR_HIT_SCREEN_PX = 12;
const MIN_THUMB_SCREEN_PX = 24;

interface AxisThumb {
  offset: number;
  size: number;
  show: boolean;
}

interface L2ScrollableBodyProps {
  zoom: number;
  padding: string;
  gap: string;
  layoutKey: string;
  children: React.ReactNode;
}

function L2ScrollableBody({ zoom, padding, gap, layoutKey, children }: L2ScrollableBodyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const vDragRef = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const hDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [vThumb, setVThumb] = useState<AxisThumb>({ offset: 0, size: 0, show: false });
  const [hThumb, setHThumb] = useState<AxisThumb>({ offset: 0, size: 0, show: false });
  const [vDragging, setVDragging] = useState(false);
  const [hDragging, setHDragging] = useState(false);

  const bar = SCROLLBAR_HIT_SCREEN_PX / zoom;
  const thumbPx = SCROLLBAR_SCREEN_PX / zoom;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const sync = () => {
      const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = el;

      if (scrollHeight <= clientHeight + 1) {
        setVThumb({ offset: 0, size: 0, show: false });
      } else {
        const minSize = MIN_THUMB_SCREEN_PX / zoom;
        const size = Math.max(minSize, (clientHeight / scrollHeight) * clientHeight);
        const track = clientHeight - size;
        const offset = track * (scrollTop / (scrollHeight - clientHeight));
        setVThumb({ offset, size, show: true });
      }

      if (scrollWidth <= clientWidth + 1) {
        setHThumb({ offset: 0, size: 0, show: false });
      } else {
        const minSize = MIN_THUMB_SCREEN_PX / zoom;
        const size = Math.max(minSize, (clientWidth / scrollWidth) * clientWidth);
        const track = clientWidth - size;
        const offset = track * (scrollLeft / (scrollWidth - clientWidth));
        setHThumb({ offset, size, show: true });
      }
    };

    sync();
    const raf = requestAnimationFrame(sync);
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [zoom, children, layoutKey]);

  const onVThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    vDragRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    setVDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onVThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!vDragRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const { scrollHeight, clientHeight } = el;
    const minSize = MIN_THUMB_SCREEN_PX / zoom;
    const thumbSize = Math.max(minSize, (clientHeight / scrollHeight) * clientHeight);
    const track = clientHeight - thumbSize;
    const scrollRange = scrollHeight - clientHeight;
    if (track <= 0 || scrollRange <= 0) return;
    const deltaY = (e.clientY - vDragRef.current.startY) / zoom;
    el.scrollTop = vDragRef.current.startScrollTop + deltaY * (scrollRange / track);
  };

  const onHThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    hDragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
    setHDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hDragRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const { scrollWidth, clientWidth } = el;
    const minSize = MIN_THUMB_SCREEN_PX / zoom;
    const thumbSize = Math.max(minSize, (clientWidth / scrollWidth) * clientWidth);
    const track = clientWidth - thumbSize;
    const scrollRange = scrollWidth - clientWidth;
    if (track <= 0 || scrollRange <= 0) return;
    const deltaX = (e.clientX - hDragRef.current.startX) / zoom;
    el.scrollLeft = hDragRef.current.startScrollLeft + deltaX * (scrollRange / track);
  };

  const endVDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!vDragRef.current) return;
    vDragRef.current = null;
    setVDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const endHDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hDragRef.current) return;
    hDragRef.current = null;
    setHDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const thumbBg = (dragging: boolean) =>
    dragging ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.3)";

  return (
    <div style={{ position: "relative", flex: "1 1 0%", minHeight: 0, overflow: "hidden" }}>
      <div
        ref={scrollRef}
        className="nowheel nodrag l2-scrollable"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "auto",
          padding,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap, minWidth: "100%" }}>{children}</div>
      </div>
      {vThumb.show && (
        <div
          className="nodrag"
          style={{
            position: "absolute",
            top: vThumb.offset,
            right: 0,
            width: bar,
            height: vThumb.size,
            display: "flex",
            justifyContent: "flex-end",
            cursor: vDragging ? "grabbing" : "grab",
            touchAction: "none",
            zIndex: 1,
          }}
          onPointerDown={onVThumbPointerDown}
          onPointerMove={onVThumbPointerMove}
          onPointerUp={endVDrag}
          onPointerCancel={endVDrag}
        >
          <div
            aria-hidden
            style={{
              width: thumbPx,
              height: "100%",
              borderRadius: 9999,
              background: thumbBg(vDragging),
            }}
          />
        </div>
      )}
      {hThumb.show && (
        <div
          className="nodrag"
          style={{
            position: "absolute",
            left: hThumb.offset,
            bottom: 0,
            height: bar,
            width: hThumb.size,
            display: "flex",
            alignItems: "flex-end",
            cursor: hDragging ? "grabbing" : "grab",
            touchAction: "none",
            zIndex: 1,
          }}
          onPointerDown={onHThumbPointerDown}
          onPointerMove={onHThumbPointerMove}
          onPointerUp={endHDrag}
          onPointerCancel={endHDrag}
        >
          <div
            aria-hidden
            style={{
              width: "100%",
              height: thumbPx,
              borderRadius: 9999,
              background: thumbBg(hDragging),
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

  const border = 2 * zoom;

  const nodeContentTopInScreen = nodeRect.top + border - parentRect.top;
  const nodeContentBottomInScreen = nodeRect.bottom - border - parentRect.top;
  const nodeContentLeftInScreen = nodeRect.left + border - parentRect.left;
  const nodeContentRightInScreen = nodeRect.right - border - parentRect.left;

  const verticalOverlap = nodeContentBottomInScreen > 0 && nodeContentTopInScreen < parentRect.height;
  const horizontalOverlap = nodeContentRightInScreen > 0 && nodeContentLeftInScreen < parentRect.width;

  if (!verticalOverlap || !horizontalOverlap) {
    return null;
  }

  const visibleTop = Math.max(0, nodeContentTopInScreen);
  const visibleBottom = Math.min(parentRect.height, nodeContentBottomInScreen);
  const visibleLeft = Math.max(0, nodeContentLeftInScreen);
  const visibleRight = Math.min(parentRect.width, nodeContentRightInScreen);

  return {
    top: (visibleTop - nodeContentTopInScreen) / zoom,
    height: (visibleBottom - visibleTop) / zoom,
    left: (visibleLeft - nodeContentLeftInScreen) / zoom,
    width: (visibleRight - visibleLeft) / zoom,
  };
}

function useClampedLayout(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const defaultStyles: React.CSSProperties = {
    position: "absolute",
    top: 0,
    height: "100%",
    left: 0,
    width: "100%",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };

  const [state, setState] = useState<{ styles: React.CSSProperties; inFov: boolean }>({
    styles: defaultStyles,
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
      setState({ styles: defaultStyles, inFov: false });
      return;
    }

    setState({
      styles: {
        ...defaultStyles,
        top: bounds.top,
        height: bounds.height,
        left: bounds.left,
        width: bounds.width,
      },
      inFov: true,
    });
  }, [containerRef, zoom, tx, ty, w, h]);

  return state;
}

function layoutKeyFromStyles(styles: React.CSSProperties): string {
  return `${styles.top}|${styles.height}|${styles.left}|${styles.width}`;
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
      <ConnectionToggle disconnected={!!data.disconnected} scale={1 / zoom} />
      {inFov && (
        <div style={clampedStyles}>
          <L2Header label={data.label} color={color} zoom={zoom} />
          <L2ScrollableBody
            zoom={zoom}
            padding={bodyPadding}
            gap={gapSize}
            layoutKey={layoutKeyFromStyles(clampedStyles)}
          >
            <L2Description description={description} color={color} zoom={zoom} />
            <L2CodeBlock snippet={data.snippet} path={data.path} zoom={zoom} />
          </L2ScrollableBody>
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}
