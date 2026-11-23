// @Architecture(descriptionShort="Pointer click, drag, and mouse-wheel CDP dispatch helpers")
import type { CdpClient } from "./cdp-client.ts";
import { resolveTargetPoint } from "./cdp-dom.ts";
import { modifierMask } from "./cdp-keyboard.ts";
import type { ClickOptions, DragOptions, Point, WheelOptions } from "./types.ts";

export async function dispatchClick(
  cdp: CdpClient,
  options: ClickOptions,
): Promise<Point> {
  const point = await resolveTargetPoint(cdp, options);
  const button = options.button ?? "left";
  const clickCount = options.clickCount ?? 1;
  const modifiers = modifierMask(options.modifiers);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    modifiers,
  });
  for (let count = 1; count <= clickCount; count++) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: point.x,
      y: point.y,
      button,
      clickCount: count,
      modifiers,
    });
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y,
      button,
      clickCount: count,
      modifiers,
    });
  }
  return point;
}

export async function dispatchDrag(
  cdp: CdpClient,
  options: DragOptions,
): Promise<{ from: Point; to: Point }> {
  const from = await resolveTargetPoint(cdp, {
    x: options.fromX,
    y: options.fromY,
    selector: options.fromSelector,
  });
  const to = await resolveTargetPoint(cdp, {
    x: options.toX,
    y: options.toY,
    selector: options.toSelector,
  });
  const steps = Math.max(1, options.steps ?? 10);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: from.x, y: from.y });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: from.x,
    y: from.y,
    button: "left",
    clickCount: 1,
  });
  for (let step = 1; step <= steps; step++) {
    const ratio = step / steps;
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      buttons: 1,
    });
  }
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: to.x,
    y: to.y,
    button: "left",
    clickCount: 1,
  });
  return { from, to };
}

export async function dispatchWheel(
  cdp: CdpClient,
  options: WheelOptions,
): Promise<Point> {
  const point = await resolveTargetPoint(cdp, options);
  const steps = Math.max(1, options.steps ?? 4);
  const stepX = (options.deltaX ?? 0) / steps;
  const stepY = (options.deltaY ?? 0) / steps;
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  for (let i = 0; i < steps; i++) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: point.x,
      y: point.y,
      deltaX: stepX,
      deltaY: stepY,
    });
  }
  return point;
}
