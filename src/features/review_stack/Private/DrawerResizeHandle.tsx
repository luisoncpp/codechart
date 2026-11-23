// @Architecture(descriptionShort="Right-edge drag handle that resizes the Review Stack drawer")
import type React from "react";

const MIN_DRAWER_WIDTH = 240;
const MAX_DRAWER_WIDTH = 720;
export const DEFAULT_DRAWER_WIDTH = 310;

interface DrawerResizeHandleProps {
  width: number;
  /** Called once on release with the final width. */
  onCommit: (width: number) => void;
}

function clampDrawerWidth(width: number): number {
  return Math.min(MAX_DRAWER_WIDTH, Math.max(MIN_DRAWER_WIDTH, width));
}

/**
 * Writes the drawer's width straight to the element while dragging and commits
 * to React state once on release: a per-pointermove setState would re-render
 * the canvas next to it (lesson drag-via-react-state-rerenders-whole-canvas).
 */
export function DrawerResizeHandle({ width, onCommit }: DrawerResizeHandleProps) {
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    const drawer = handle.parentElement;
    if (!drawer) return;
    const startX = e.clientX;
    let next = width;
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      next = clampDrawerWidth(width + ev.clientX - startX);
      drawer.style.width = `${next}px`;
    };
    const onUp = (ev: PointerEvent) => {
      if (handle.hasPointerCapture?.(ev.pointerId)) handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      onCommit(next);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize Review Stack"
      aria-valuenow={width}
      aria-valuemin={MIN_DRAWER_WIDTH}
      aria-valuemax={MAX_DRAWER_WIDTH}
      title="Drag to resize"
      className="rs-resize-handle"
      onPointerDown={onPointerDown}
    />
  );
}
