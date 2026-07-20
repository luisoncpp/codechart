// @Architecture(descriptionShort="Child-free region picker for the L0 card description")
import type { GroupNodeData } from "../../../../domain/graph";

export type DescRegion = { width: number; height: number };
export type CardFrame = { cardW: number; cardH: number; descTop: number };
type Obstacles = NonNullable<GroupNodeData["childObstacles"]>;

const CARD_PADDING = 16;
const CHILD_GAP = 12;

/** Largest child-free rectangle anchored below the title at the card's left
 *  edge, swept over candidate bottoms (each obstacle top + the card bottom).
 *  Independent minima (minChildX from one child, minChildY from another)
 *  falsely describe no space when a low-left and a high-right subgroup
 *  coexist; only the rectangles can see the top-left gap between them. */
export function descriptionRegion(data: GroupNodeData, card: CardFrame): DescRegion {
  const obstacles = data.childObstacles;
  if (!obstacles) return minimaRegion(data, card);
  const bottoms = [
    ...obstacles.map((box) => box.y - CHILD_GAP),
    card.cardH - CARD_PADDING,
  ];
  let best: DescRegion = { width: 0, height: 0 };
  for (const bottom of bottoms) {
    const candidate = {
      width: rowSpanWidth(obstacles, card, bottom),
      height: bottom - card.descTop,
    };
    if (regionArea(candidate) > regionArea(best)) best = candidate;
  }
  return best;
}

/** Width left of the obstacles whose rows intersect [descTop, bottom),
 *  keeping the CHILD_GAP clearance on both axes. */
function rowSpanWidth(obstacles: Obstacles, card: CardFrame, bottom: number): number {
  const fullWidth = card.cardW - 2 * CARD_PADDING;
  const blockers = obstacles.filter(
    (box) => box.y - CHILD_GAP < bottom && box.y + box.height > card.descTop,
  );
  if (blockers.length === 0) return fullWidth;
  const edge = Math.min(...blockers.map((box) => box.x));
  return Math.min(fullWidth, edge - CARD_PADDING - CHILD_GAP);
}

/** Minima fallback for data without obstacle rectangles: the band above the
 *  topmost child or the column left of the leftmost one, whichever is larger. */
function minimaRegion(data: GroupNodeData, card: CardFrame): DescRegion {
  const band = {
    width: card.cardW - 2 * CARD_PADDING,
    height: (data.minChildY ?? card.cardH) - card.descTop - CHILD_GAP,
  };
  if (data.minChildX === undefined) return band;
  const column = {
    width: data.minChildX - CARD_PADDING - CHILD_GAP,
    height: card.cardH - card.descTop - CARD_PADDING,
  };
  return regionArea(column) > regionArea(band) ? column : band;
}

export function regionArea(region: DescRegion): number {
  return Math.max(0, region.width) * Math.max(0, region.height);
}
