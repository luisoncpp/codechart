// @Architecture(descriptionShort="Measures the group-title obstacle reserved during nested layout")
import { L0_ZOOM_BOUNDARY, type GroupNode } from "../../graph";

/** Largest counter-scale an expanded header renders at. The layout reserve is
 *  sized for this scale, so the view must clamp here (`expandedHeaderScale`):
 *  a group expanded below the L0 zoom boundary would otherwise keep growing
 *  its title past the obstacle the layout reserved for it. */
export const EXPANDED_HEADER_MAX_SCALE = 1 / L0_ZOOM_BOUNDARY;

const FONT_SIZE = 12;
/** Bold uppercase sans ≈ 0.72em per char (same ratio as the L0 card label). */
const CHAR_WIDTH_RATIO = 0.72;
const LETTER_SPACING = 0.4;
/** 4px vertical padding ×2 + 24px toggle row. */
const HEADER_HEIGHT = 32;

/** Camera counter-scale the expanded header actually renders at. */
export function expandedHeaderScale(cameraScale: number): number {
  return Math.min(cameraScale, EXPANDED_HEADER_MAX_SCALE);
}

/** World-unit footprint of the rendered title strip at `cameraScale`
 *  (10px padding + 24px toggle + 6px gap + optional icon + the bold uppercase
 *  label — mirrors ExpandedHeader, clamp included). */
export function groupHeaderFootprint(
  group: GroupNode,
  cameraScale: number,
): { width: number; height: number } {
  const scale = expandedHeaderScale(cameraScale);
  const iconWidth = group.annotation?.icon ? 20 : 0;
  const labelWidth = group.label.length * (FONT_SIZE * CHAR_WIDTH_RATIO + LETTER_SPACING);
  const chromeWidth = 20 + 24 + 6 + iconWidth;
  return {
    width: (chromeWidth + labelWidth) * scale,
    height: HEADER_HEIGHT * scale,
  };
}

/** Internal ELK id for the invisible title obstacle inside a nested group. */
export function groupHeaderBoxId(groupId: string): string {
  return `${groupId}::__header__`;
}

/** Title footprint at the largest scale the header can render — what the
 *  layout reserves top-left so subgroups never sit under the title. */
export function groupHeaderBoxSize(group: GroupNode): { width: number; height: number } {
  const footprint = groupHeaderFootprint(group, EXPANDED_HEADER_MAX_SCALE);
  return { width: Math.ceil(footprint.width), height: Math.ceil(footprint.height) };
}
