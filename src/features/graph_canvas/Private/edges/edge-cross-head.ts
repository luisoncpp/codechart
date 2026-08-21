// @Architecture(descriptionShort="Shared X-head line geometry for edge crosses")
interface CrossHeadLines {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}

function crossHeadLines(
  tip: { x: number; y: number },
  angle: number,
  size = 5,
): CrossHeadLines {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = size * c;
  const dy = size * s;
  const px = -s * size * 0.7;
  const py = c * size * 0.7;
  return {
    x1: tip.x - dx + px,
    y1: tip.y - dy + py,
    x2: tip.x + dx - px,
    y2: tip.y + dy - py,
    x3: tip.x - dx - px,
    y3: tip.y - dy - py,
    x4: tip.x + dx + px,
    y4: tip.y + dy + py,
  };
}

export function crossHeadPath(
  tip: { x: number; y: number },
  angle: number,
  size = 5,
): string {
  const lines = crossHeadLines(tip, angle, size);
  return `M ${lines.x1},${lines.y1} L ${lines.x2},${lines.y2} M ${lines.x3},${lines.y3} L ${lines.x4},${lines.y4}`;
}
