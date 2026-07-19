// @Architecture(descriptionShort="Scrolls a frame-body element to center a child without moving the window")

/**
 * Center an element inside the widget's scrollable body only.
 * `scrollIntoView` would also scroll every outer ancestor (including the
 * window) when the frame sits near a viewport edge, shifting the whole app.
 */
export function centerElementInBody(el: HTMLElement | null) {
  const body = el?.closest(".symbol-widget__body");
  if (!el || !body) return;
  const elBox = el.getBoundingClientRect();
  const bodyBox = body.getBoundingClientRect();
  body.scrollTop +=
    elBox.top - bodyBox.top - body.clientHeight / 2 + elBox.height / 2;
}
