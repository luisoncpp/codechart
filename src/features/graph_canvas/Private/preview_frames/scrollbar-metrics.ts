// @Architecture(descriptionShort="Measures the platform's native scrollbar thickness once, so the resize grip can sit beside the bar instead of on its buttons")

let measured: number | undefined;

/**
 * Native vertical scrollbar thickness, in CSS pixels. `0` where the platform
 * draws overlay scrollbars (nothing to sit beside, so the grip keeps the
 * corner). Measured once — it is a platform constant, not a per-frame one.
 */
export function nativeScrollbarWidth(): number {
  if (measured !== undefined) return measured;
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll";
  document.body.appendChild(probe);
  measured = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  return measured;
}
