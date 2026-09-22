// @Architecture(descriptionShort="Corner-grip pointer resize: writes the frame element's size directly, commits once on release")
import type React from "react";
import { MIN_FRAME_HEIGHT, MIN_FRAME_WIDTH } from "./frame-list";
import type { Size } from "./frame-placement";

/**
 * Resize a frame from its bottom-right grip.
 *
 * This replaces `resize: both`, which the frame used to carry. Pressing a
 * native resizer starts a browser-internal autoscroll of the scrollable box
 * under the cursor — the frame body, which reaches the same corner — and it
 * runs on a timer for as long as the button is held, with no pointer movement
 * and nothing in the JS call stack. Nothing cancels it: `preventDefault()`
 * kills the resize but not the scrolling, `overflow: hidden` and
 * `pointer-events: none` on the body are both driven through, and a bottom
 * gutter only narrows the odds (a 10px one still fired in 1 of 4 presses).
 * Undoing each tick from a `scroll` handler is too late to be invisible —
 * scroll events dispatch *after* the compositor has already painted, so the
 * correction reads as a tremble.
 *
 * A grip we own starts no native gesture, so no autoscroll exists to fight:
 * measured at 0 movement across 7 presses where the native resizer moved the
 * body in half of them. Sizes are written straight to the element, as in
 * `startFrameDrag` — a React state commit per pointermove re-renders the whole
 * canvas (React Flow nodes plus every open frame's source) and makes the
 * gesture lag; `onResizeEnd` commits the final clamped size to React state
 * once on release, so the model — not the DOM — owns the frame's box.
 */
export function startFrameResize(
  event: React.PointerEvent,
  onResizeEnd: (size: Size) => void,
) {
  const frameEl = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-frame-id]");
  if (!frameEl) return;
  // Also stops the press from starting a text selection in the body.
  event.preventDefault();

  const startX = event.clientX;
  const startY = event.clientY;
  const start = contentBox(frameEl);
  let last: Size | null = null;

  const handleMove = (e: PointerEvent) => {
    last = {
      width: Math.max(MIN_FRAME_WIDTH, start.width + (e.clientX - startX)),
      height: Math.max(MIN_FRAME_HEIGHT, start.height + (e.clientY - startY)),
    };
    frameEl.style.width = `${last.width}px`;
    frameEl.style.height = `${last.height}px`;
  };
  const handleUp = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleUp);
    if (!last) return;
    onResizeEnd(last);
  };
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
  window.addEventListener("pointercancel", handleUp);
}

/**
 * `.symbol-widget` is `content-box`, so `style.width` sets the content width
 * while `offsetWidth` counts the borders too — basing the drag on the latter
 * would grow the frame by the border on the first move.
 */
function contentBox(el: HTMLElement): { width: number; height: number } {
  const style = getComputedStyle(el);
  return {
    width: parseFloat(style.width) || el.offsetWidth,
    height: parseFloat(style.height) || el.offsetHeight,
  };
}
