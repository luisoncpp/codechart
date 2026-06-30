import type { LayoutBox } from "../../layout/Private/layout-types";
import { PRESETS } from "../../layout/Private/layout-presets";
import type { ProjectionCtx } from "./rf-projection-types";

const DESC_GAP = 8;

/** Parent-relative geometry of a group's reserved description box, pulled up to
 *  the highest position in its column that stays clear of every other child box.
 *  ELK vertically centers a short column under the header; rather than blindly
 *  pinning to the top (which can collide with a module ELK placed up there), we
 *  raise the box only until a sibling that shares its x-span blocks the way. */
export function descriptionBoxGeometry(
  groupId: string,
  groupBox: LayoutBox,
  ctx: ProjectionCtx,
) {
  const box = ctx.descriptionByGroup.get(groupId);
  if (!box) return undefined;
  const y = freeTopFor(box, ctx.childBoxesByGroup.get(groupId) ?? [], groupBox);
  return { x: box.x - groupBox.x, y: y - groupBox.y, width: box.width, height: box.height };
}

/** Highest absolute `y` the description box can sit at without overlapping a
 *  horizontally-overlapping sibling above it; floored at the group content top. */
function freeTopFor(box: LayoutBox, siblings: LayoutBox[], groupBox: LayoutBox): number {
  let top = groupBox.y + PRESETS.groupPadding + PRESETS.groupHeaderHeight;
  for (const s of siblings) {
    if (s.id === box.id) continue;
    const xOverlaps = s.x < box.x + box.width && box.x < s.x + s.width;
    if (!xOverlaps || s.y >= box.y) continue; // not blocking, or not above the box
    top = Math.max(top, s.y + s.height + DESC_GAP);
  }
  return Math.min(box.y, top); // only ever move up, never below the reserved slot
}
