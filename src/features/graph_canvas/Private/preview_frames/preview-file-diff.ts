// @Architecture(descriptionShort="Resolves the FileLineDiff a preview frame should render")
import {
  computeLineDiff,
  type FileLineDiff,
  type GraphDiffOverlay,
} from "../../../../domain/diff";

/** Parsed hunks win; a deleted file with only a snapshot synthesizes all-removed. */
export function fileDiffForPreview(
  path: string,
  overlay: GraphDiffOverlay | null,
): FileLineDiff | undefined {
  if (!overlay) return undefined;
  const parsed = overlay.lineDiffByPath.get(path);
  if (parsed) return parsed;
  if (!overlay.deletedModuleIds.has(path)) return undefined;
  const before = overlay.beforeSourceByPath.get(path);
  if (before === undefined) return undefined;
  return computeLineDiff(before, "");
}
