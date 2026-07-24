// @Architecture(descriptionShort="Opacity/border styling for modules under a diff overlay")
import { UNCHANGED_MODULE_DIFF_OPACITY } from "../../../../domain/diff";

export function moduleDiffOpacity(
  diffState?: "affected" | "deleted" | "unchanged",
): number {
  if (diffState === "unchanged") return UNCHANGED_MODULE_DIFF_OPACITY;
  return 1;
}

const DIFF_MODULE_BORDER_PX = 3;

export function moduleDiffBorderWidth(
  diffState: "affected" | "deleted" | "unchanged" | undefined,
  fallbackPx = 2,
): number {
  if (diffState === "affected" || diffState === "deleted") return DIFF_MODULE_BORDER_PX;
  return fallbackPx;
}

export function moduleDiffBorder(
  diffState: "affected" | "deleted" | "unchanged" | undefined,
  fallback: string,
  counterScale = 1,
): string {
  const px = DIFF_MODULE_BORDER_PX * counterScale;
  if (diffState === "affected") return `${px}px solid #16a34a`;
  if (diffState === "deleted") return `${px}px solid #dc2626`;
  return fallback;
}
