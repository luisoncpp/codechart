// @Architecture(descriptionShort="Pure wrap-around stepping through search matches")

/**
 * Next active index with wrap-around; `-1` (results shown but not yet
 * navigated) steps to the first match forward or the last match backward.
 */
export function stepIndex(current: number, delta: 1 | -1, total: number): number {
  if (total <= 0) return -1;
  if (current === -1) return delta === 1 ? 0 : total - 1;
  return (current + delta + total) % total;
}
