import { placeAdjacentFrame, type FrameRect, type Position } from "./frame-placement";

/** Place beside a rendered frame, honoring its live resized/dragged DOM box. */
export function placeNextToFrame(
  anchorFrameId: number,
  container: HTMLElement,
): Position | null {
  const rects = liveFrameRects(container);
  const anchor = rects.get(anchorFrameId);
  if (!anchor) return null;
  const containerSize = { width: container.clientWidth, height: container.clientHeight };
  return placeAdjacentFrame(anchor, [...rects.values()], containerSize);
}

function liveFrameRects(container: HTMLElement): Map<number, FrameRect> {
  const containerBox = container.getBoundingClientRect();
  const rects = new Map<number, FrameRect>();
  for (const el of container.querySelectorAll<HTMLElement>("[data-frame-id]")) {
    const box = el.getBoundingClientRect();
    rects.set(Number(el.dataset.frameId), {
      top: box.top - containerBox.top,
      left: box.left - containerBox.left,
      width: box.width,
      height: box.height,
    });
  }
  return rects;
}
