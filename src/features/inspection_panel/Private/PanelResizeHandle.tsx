// @Architecture(descriptionShort="Left-edge drag handle to resize the inspector panel")
import { useCallback } from "react";
import type React from "react";
import {
  MAX_INSPECTOR_WIDTH,
  MIN_INSPECTOR_WIDTH,
  useInspectorLayout,
} from "./InspectorLayoutContext";

export function PanelResizeHandle() {
  const { width, setWidth } = useInspectorLayout();

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const next = clamp(
          startWidth + startX - ev.clientX,
          MIN_INSPECTOR_WIDTH,
          MAX_INSPECTOR_WIDTH,
        );
        setWidth(next);
      };

      const onUp = (ev: PointerEvent) => {
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    },
    [setWidth, width],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize inspector"
      title="Drag to resize"
      onPointerDown={onPointerDown}
      style={handleStyle}
    />
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const handleStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  bottom: 0,
  width: 5,
  marginLeft: -2,
  cursor: "col-resize",
  touchAction: "none",
  zIndex: 1,
};
