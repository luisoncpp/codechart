// @Architecture(descriptionShort="Scrolls a frame-body element to center a child without moving the window")

/**
 * Center an element inside the widget's scrollable body only.
 * `scrollIntoView` would also scroll every outer ancestor (including the
 * window) when the frame sits near a viewport edge, shifting the whole app.
 */
export function centerElementInBody(el: HTMLElement | null) {
  const body = el?.closest<HTMLElement>(".symbol-widget__body");
  if (!el || !body) return;
  const elBox = el.getBoundingClientRect();
  const bodyBox = body.getBoundingClientRect();
  const scale = visualScale(bodyBox.height, body.offsetHeight);
  body.scrollTop +=
    (elBox.top - bodyBox.top + elBox.height / 2) / scale - body.clientHeight / 2;
}

/**
 * A just-opened frame is still animating through `transform: scale()`, so its
 * client rects are visual pixels while `scrollTop` counts layout pixels. The
 * mismatch grows with the distance to the target line, so a definition deep in
 * a file lands off-screen. Recover the live scale to convert back.
 */
function visualScale(visualHeight: number, layoutHeight: number): number {
  if (layoutHeight <= 0 || visualHeight <= 0) return 1;
  return visualHeight / layoutHeight;
}
