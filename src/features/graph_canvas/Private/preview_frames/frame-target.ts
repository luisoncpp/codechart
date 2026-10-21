// @Architecture(descriptionShort="Which preview frame a frame-scoped keyboard shortcut targets")

/** The frame a shortcut targets: focused frame first, hovered frame else. */
export function targetFrame(): Element | null {
  return (
    document.activeElement?.closest(".symbol-widget") ??
    document.querySelector(".symbol-widget:hover")
  );
}
