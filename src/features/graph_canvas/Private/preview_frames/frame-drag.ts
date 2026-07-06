// @Architecture(descriptionShort="Header-bar pointer drag: moves the frame element directly, commits once on release")
import type React from "react";
import type { Position } from "./frame-placement";

/**
 * Start dragging a frame from its header bar. Listens on `window` so the
 * drag keeps tracking when the pointer leaves the header, and detaches on
 * pointer release.
 *
 * While dragging, positions are written straight to the frame element;
 * `onDrop` commits the final position to React state only on release. A
 * state commit per pointermove re-renders the whole canvas (React Flow
 * nodes plus every open frame's source), which makes dragging lag.
 */
export function startFrameDrag(
  event: React.PointerEvent,
  origin: Position,
  onDrop: (pos: Position) => void,
) {
  const frameEl = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-frame-id]");
  const startX = event.clientX;
  const startY = event.clientY;
  let last: Position | null = null;

  const handleMove = (e: PointerEvent) => {
    last = {
      top: origin.top + (e.clientY - startY),
      left: origin.left + (e.clientX - startX),
    };
    if (!frameEl) return;
    frameEl.style.top = `${last.top}px`;
    frameEl.style.left = `${last.left}px`;
  };
  const handleUp = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    if (!last) return;
    onDrop(last);
    suppressNextClick();
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
