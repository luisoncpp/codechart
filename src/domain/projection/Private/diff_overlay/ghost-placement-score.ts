// @Architecture(descriptionShort="Candidate generation and scoring for greedy ghost module placement")

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "diff" | "group" | "previous";
}

export interface ContainerBounds {
  width: number;
  height: number;
}

export function pickBestPosition(
  box: { width: number; height: number },
  obstacles: readonly Obstacle[],
  bounds: ContainerBounds,
  initialPos?: { x: number; y: number },
): { x: number; y: number } {
  if (initialPos) {
    const initialScore = scoreCandidate({ ...initialPos, ...box }, obstacles, bounds);
    if (initialScore === 0) return initialPos;
  }
  const candidates = generateCandidates(box, obstacles, bounds, initialPos);
  let bestPos = initialPos ?? { x: 20, y: 40 };
  let bestScore = initialPos
    ? scoreCandidate({ ...initialPos, ...box }, obstacles, bounds)
    : Infinity;

  for (const cand of candidates) {
    const score = scoreCandidate({ ...cand, ...box }, obstacles, bounds);
    if (score < bestScore) {
      bestScore = score;
      bestPos = cand;
      if (score === 0) break;
    }
  }
  return bestPos;
}

function generateCandidates(
  box: { width: number; height: number },
  obstacles: readonly Obstacle[],
  bounds: ContainerBounds,
  initialPos?: { x: number; y: number },
): Array<{ x: number; y: number }> {
  const candidates: Array<{ x: number; y: number }> = [];
  if (initialPos) candidates.push(initialPos);

  for (const obs of obstacles) {
    candidates.push({ x: obs.x + obs.width + 15, y: obs.y });
    candidates.push({ x: obs.x - box.width - 15, y: obs.y });
    candidates.push({ x: obs.x, y: obs.y + obs.height + 15 });
    candidates.push({ x: obs.x, y: obs.y - box.height - 15 });
  }

  const maxX = Math.max(bounds.width - box.width, 20);
  const maxY = Math.max(bounds.height - box.height, 40);
  for (let x = 20; x <= maxX; x += 60) {
    for (let y = 40; y <= maxY; y += 60) {
      candidates.push({ x, y });
    }
  }
  return candidates;
}

function scoreCandidate(
  cand: { x: number; y: number; width: number; height: number },
  obstacles: readonly Obstacle[],
  bounds: ContainerBounds,
): number {
  let score = 0;
  for (const obs of obstacles) {
    const area = overlapArea(cand, obs);
    if (area === 0) continue;
    if (obs.kind === "diff") score += area * 1_000_000;
    else if (obs.kind === "group") score += area * 100_000;
    else score += area * 1_000;
  }
  if (cand.x < 10) score += (10 - cand.x) * 5_000;
  if (cand.y < 35) score += (35 - cand.y) * 5_000;
  if (cand.x + cand.width > bounds.width) {
    score += (cand.x + cand.width - bounds.width) * 10;
  }
  if (cand.y + cand.height > bounds.height) {
    score += (cand.y + cand.height - bounds.height) * 10;
  }
  score += (cand.x + cand.y) * 0.001;
  return score;
}

function overlapArea(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): number {
  const overlapW = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapH = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapW * overlapH;
}
