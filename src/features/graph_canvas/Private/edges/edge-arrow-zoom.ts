// @Architecture(descriptionShort="Zoom threshold and arrowhead path geometry")
const ARROW_LEN = 8; // edge-path.ts ARROW_LEN
const ARROW_WIDTH = 8; // edge-path.ts arrowHeadPoints half-span
/** 4.4px screen floor so arrowheads show from Level 1 card view (zoom >= 0.55). */
const ARROW_SCREEN_MIN = 4.4;

export function showArrowHeadsAtZoom(zoom: number): boolean {
  if (!Number.isFinite(zoom) || zoom <= 0) return false;
  return ARROW_LEN * zoom >= ARROW_SCREEN_MIN;
}

export function arrowHeadPath(
  tip: { x: number; y: number },
  angle: number,
): string {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const backX = tip.x - c * ARROW_LEN;
  const backY = tip.y - s * ARROW_LEN;
  const halfW = ARROW_WIDTH / 2;
  const px = -s * halfW;
  const py = c * halfW;
  const x1 = backX + px;
  const y1 = backY + py;
  const x2 = backX - px;
  const y2 = backY - py;
  return `M ${tip.x},${tip.y} L ${x1},${y1} L ${x2},${y2} Z`;
}
