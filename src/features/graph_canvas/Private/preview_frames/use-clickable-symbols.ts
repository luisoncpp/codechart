// @Architecture(descriptionShort="Resolves each open frame's clickable identifier names, once per module")
import { useMemo } from "react";
import type { ProjectGraph } from "../../../../domain/graph";
import { combinedSymbolTargets } from "./imported-symbol-resolver";
import type { PreviewFrame } from "./frame-list";

/**
 * Names rendered as `hl-clickable` per frame module. A frame opened for a file
 * that is not a module (a wiki-link destination) simply resolves to nothing.
 */
export function useClickableSymbols(
  graph: ProjectGraph | null,
  frames: readonly PreviewFrame[],
  sources: ReadonlyMap<string, string>,
): ReadonlyMap<string, ReadonlySet<string>> {
  return useMemo(
    /*resolveClickableNamesPerFrameModule*/ () => {
      const byModule = new Map<string, ReadonlySet<string>>();
      if (!graph) return byModule;
      for (const frame of frames) {
        if (byModule.has(frame.moduleId)) continue;
        const targets = combinedSymbolTargets(graph, frame.moduleId, sources);
        byModule.set(frame.moduleId, new Set(targets.keys()));
      }
      return byModule;
    },
    [graph, frames, sources],
  );
}
