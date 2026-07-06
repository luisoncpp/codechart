// @Architecture(descriptionShort="Header-bar pointer drag: tracks deltas and reports frame positions")
import type React from "react";
import type { Position } from "./frame-placement";

/**
 * Start dragging a frame from its header bar. Listens on `window` so the
 * drag keeps tracking when the pointer leaves the header, and detaches on
 * pointer release.
 */
export function startFrameDrag(
  event: React.PointerEvent,
  origin: Position,
  onMove: (pos: Position) => void,
) {
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;

  const handleMove = (e: PointerEvent) => {
    moved = true;
    onMove({
      top: origin.top + (e.clientY - startY),
      left: origin.left + (e.clientX - startX),
    });
  };
  const handleUp = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    if (moved) suppressNextClick();
  };
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
}

/**
 * A drag released outside the frame fires a `click` on the common ancestor of
 * the press/release targets — which the close-on-outside-click listener would
 * treat as "outside all frames". Swallow that one click in capture phase.
 */
function suppressNextClick() {
  const swallow = (e: MouseEvent) => {
    e.stopPropagation();
    cancel();
  };
  const cancel = () => {
    window.removeEventListener("click", swallow, /*useCapture=*/ true);
    clearTimeout(timer);
  };
  window.addEventListener("click", swallow, /*useCapture=*/ true);
  const timer = setTimeout(/*expireIfNoClickFollows*/ cancel, /*delayInMs=*/100);
}
