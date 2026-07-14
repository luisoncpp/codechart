// @Architecture(descriptionShort="Pure placement math for preview frames on the canvas overlay")
import { FRAME_WIDTH, FRAME_HEIGHT } from "./frame-list";

export interface FrameRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Position {
  top: number;
  left: number;
}

export interface ClientPoint {
  x: number;
  y: number;
}

const SPACING = 8;

/** Initial placement next to a clicked symbol node (container-relative). */
export function computeWidgetPosition(
  symbolRect: DOMRect,
  containerRect: DOMRect,
): Position {
  let left = symbolRect.right - containerRect.left + SPACING;
  const overflowsRight = left + FRAME_WIDTH > containerRect.width;
  const fitsLeft = symbolRect.left - containerRect.left > FRAME_WIDTH;
  if (overflowsRight && fitsLeft) {
    left = symbolRect.left - containerRect.left - FRAME_WIDTH - SPACING;
  }

  let top = symbolRect.top - containerRect.top;
  if (top + FRAME_HEIGHT > containerRect.height) {
    top = containerRect.height - FRAME_HEIGHT - SPACING;
  }
  if (top < SPACING) top = SPACING;

  return { top, left };
}

/** Initial placement for a document opened from a cursor-positioned menu. */
export function computePointWidgetPosition(
  point: ClientPoint,
  containerRect: DOMRect,
): Position {
  const maxLeft = Math.max(SPACING, containerRect.width - FRAME_WIDTH - SPACING);
  const maxTop = Math.max(SPACING, containerRect.height - FRAME_HEIGHT - SPACING);
  const left = Math.min(Math.max(SPACING, point.x - containerRect.left), maxLeft);
  const top = Math.min(Math.max(SPACING, point.y - containerRect.top), maxTop);
  return { top, left };
}

/**
 * Place a frame opened from another frame: right of the anchor, else below,
 * else above; when every spot overlaps an existing frame (or overflows the
 * container), fall back to the right anyway.
 */
export function placeAdjacentFrame(
  anchor: FrameRect,
  existing: readonly FrameRect[],
  container: Size,
): Position {
  const right = { top: anchor.top, left: anchor.left + anchor.width + SPACING };
  const below = { top: anchor.top + anchor.height + SPACING, left: anchor.left };
  const above = { top: anchor.top - FRAME_HEIGHT - SPACING, left: anchor.left };
  for (const candidate of [right, below, above]) {
    if (isFreeSpot(candidate, existing, container)) return candidate;
  }
  return right;
}

function isFreeSpot(
  pos: Position,
  existing: readonly FrameRect[],
  container: Size,
): boolean {
  const rect = { ...pos, width: FRAME_WIDTH, height: FRAME_HEIGHT };
  if (pos.top < 0 || pos.left < 0) return false;
  if (pos.left + rect.width > container.width) return false;
  if (pos.top + rect.height > container.height) return false;
  return !existing.some((other) => intersects(rect, other));
}

function intersects(a: FrameRect, b: FrameRect): boolean {
  const separated =
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top;
  return !separated;
}
