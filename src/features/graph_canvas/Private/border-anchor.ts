export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export type Side = "left" | "right" | "top" | "bottom";
export interface Anchor extends Point {
  side: Side;
}

/**
 * Point on `box`'s border where the ray from its center toward `toward` exits.
 * Lets an edge float to the side that faces the other node (Idea 1) instead of a
 * fixed handle, so a node's out-edges fan across its border rather than one point.
 */
export function borderAnchor(box: Box, toward: Point): Anchor {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy, side: "right" };

  const scaleX = dx === 0 ? Infinity : box.width / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : box.height / 2 / Math.abs(dy);
  const t = Math.min(scaleX, scaleY);
  return {
    x: cx + dx * t,
    y: cy + dy * t,
    side: sideFor(scaleX, scaleY, dx, dy),
  };
}

export function centerOf(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Quadratic-bezier SVG path from `from` to `to`, bowed sideways by `bow` px at the
 * midpoint (perpendicular to the straight line). Lets a soft edge arc clear of the
 * import/violation edges sharing the same corridor instead of overlapping them.
 */
export function bowedPath(from: Point, to: Point, bow: number): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow; // perpendicular offset
  const cy = my + (dx / len) * bow;
  return `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`;
}

function sideFor(scaleX: number, scaleY: number, dx: number, dy: number): Side {
  if (scaleX < scaleY) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}
