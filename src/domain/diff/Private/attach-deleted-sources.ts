// @Architecture(descriptionShort="Fills overlay.beforeSourceByPath for deleted files")
import { bodiesFromUnifiedDiff } from "./rename-bodies";
import type { GraphDiffOverlay } from "./types";

/** Snapshot text wins; otherwise reconstruct from unified-diff `-` hunks. */
export function attachDeletedBeforeSources(
  overlay: GraphDiffOverlay,
  snapshotBefore?: ReadonlyMap<string, string>,
): GraphDiffOverlay {
  const fromDiff = overlay.unifiedDiff
    ? bodiesFromUnifiedDiff(overlay.unifiedDiff).old
    : new Map<string, string>();
  const beforeSourceByPath = new Map<string, string>();
  for (const id of overlay.deletedModuleIds) {
    const source =
      snapshotBefore?.get(id) ?? fromDiff.get(id) ?? overlay.beforeSourceByPath.get(id);
    if (source === undefined) continue;
    beforeSourceByPath.set(id, source);
  }
  return { ...overlay, beforeSourceByPath };
}
