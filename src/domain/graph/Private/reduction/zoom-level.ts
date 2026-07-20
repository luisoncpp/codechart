import type { ProjectGraph } from "../../model/ProjectGraph";

/** Zoom level: 0 bird's-eye, 1 architectural, 1.5 symbols, 2 implementation (source). */
export type ZoomLevel = 0 | 1 | 1.5 | 2;

/** Camera boundary between collapsed bird's-eye groups and architectural detail. */
export const L0_ZOOM_BOUNDARY = 0.45;

/** Top-level groups (parentless roots in the group forest). */
export function topLevelGroupIds(graph: ProjectGraph): string[] {
  return graph.groups.filter((g) => g.parentId === null).map((g) => g.id);
}

/** Every group — the L0 default collapse set. */
export function allGroupIds(graph: ProjectGraph): string[] {
  return graph.groups.map((g) => g.id);
}

/** Map React Flow's continuous zoom factor to a discrete detail level. */
export function levelFromZoom(
  factor: number,
  opts?: { disableL0?: boolean; currentLevel?: ZoomLevel },
): ZoomLevel {
  if (opts?.currentLevel === 2 && factor >= 3.35) return 2;
  if (factor < L0_ZOOM_BOUNDARY) return opts?.disableL0 ? 1 : 0;
  if (factor < 0.9) return 1;
  if (factor < 3.5) return 1.5;
  return 2;
}
