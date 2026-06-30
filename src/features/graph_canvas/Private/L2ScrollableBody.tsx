import { useState, useRef, useLayoutEffect } from "react";

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

export interface L2ScrollableBodyProps {
  zoom: number;
  padding: string;
  gap: string;
  layoutKey: string;
  scrollbarInsetPx?: number;
  /** When true, grow inside a flex column (module L2 document). */
  flexChild?: boolean;
  children: React.ReactNode;
}

export function L2ScrollableBody({
  zoom,
  padding,
  gap,
  layoutKey,
  scrollbarInsetPx = 0,
  flexChild = false,
  children,
}: L2ScrollableBodyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const vDragRef = useRef<{ startY: number; startScrollTop: number } | null>(null);
  const hDragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  const [vThumb, setVThumb] = useState<AxisThumb>({ offset: 0, size: 0, show: false });
  const [hThumb, setHThumb] = useState<AxisThumb>({ offset: 0, size: 0, show: false });
  const [vDragging, setVDragging] = useState(false);
  const [hDragging, setHDragging] = useState(false);

  const bar = SCROLLBAR_HIT_SCREEN_PX / zoom;
  const thumbPx = SCROLLBAR_SCREEN_PX / zoom;

  useLayoutEffect(/*syncScrollbars*/ () => {
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
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      sync();
      raf2 = requestAnimationFrame(sync);
    });
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    const watch = (node: Element) => {
      ro.observe(node);
      node.querySelectorAll(".group-markdown-body, pre, table").forEach((n) => ro.observe(n));
    };
    watch(el);
    for (const child of el.children) watch(child);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
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
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        ...(flexChild
          ? { flex: "1 1 0%", minHeight: 0 }
          : { width: "100%", height: "100%" }),
      }}
    >
      <div
        ref={scrollRef}
        className="nowheel nodrag l2-scrollable"
        style={{ position: "absolute", inset: 0, overflow: "auto", padding }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap, minWidth: "100%" }}>{children}</div>
      </div>
      {vThumb.show && (
        <div
          className="nodrag"
          style={{
            position: "absolute",
            top: vThumb.offset,
            right: scrollbarInsetPx,
            width: bar,
            height: vThumb.size,
            display: "flex",
            justifyContent: "flex-end",
            cursor: vDragging ? "grabbing" : "grab",
            touchAction: "none",
            zIndex: 10,
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
            bottom: scrollbarInsetPx,
            height: bar,
            width: hThumb.size,
            display: "flex",
            alignItems: "flex-end",
            cursor: hDragging ? "grabbing" : "grab",
            touchAction: "none",
            zIndex: 10,
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
