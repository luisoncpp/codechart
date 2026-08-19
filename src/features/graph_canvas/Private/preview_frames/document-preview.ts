// @Architecture(descriptionShort="Opens a module document preview, including deleted diff ghosts")
import type { RefObject } from "react";
import type { GraphDiffOverlay } from "../../../../domain/diff";
import type { ModuleNode, ProjectGraph } from "../../../../domain/graph";
import type { GraphSessionStore } from "../../../../state/graph-session";
import { computePointWidgetPosition } from "./frame-placement";
import type { OpenPreviewFrame } from "./frame-list";

interface DocumentPreviewRequest {
  moduleId: string;
  color: string;
  x: number;
  y: number;
}

interface DocumentPreviewDeps {
  containerRef: RefObject<HTMLDivElement | null>;
  store: GraphSessionStore;
  graph: ProjectGraph | null;
  diffOverlay: GraphDiffOverlay | null;
  open: OpenPreviewFrame;
  prefetchSources: (moduleId: string) => void;
}

/** Live module, else a deleted ghost from the active diff overlay. */
function findPreviewModule(
  graph: ProjectGraph | null,
  overlay: GraphDiffOverlay | null,
  moduleId: string,
): ModuleNode | undefined {
  return (
    graph?.modules.find((item) => item.id === moduleId) ??
    overlay?.ghostModules.find((item) => item.id === moduleId)
  );
}

export function createDocumentPreview(deps: DocumentPreviewDeps) {
  return async (request: DocumentPreviewRequest) => {
    const container = deps.containerRef.current;
    const module = findPreviewModule(deps.graph, deps.diffOverlay, request.moduleId);
    if (!container || !module) return;
    const deleted = Boolean(deps.diffOverlay?.deletedModuleIds.has(module.id));
    const sourceText = deleted ? "" : await deps.store.fetchModuleSource(module.id);
    const pos = computePointWidgetPosition(request, container.getBoundingClientRect());
    if (!deleted) void deps.prefetchSources(module.id);
    deps.open("close-unpinned", {
      moduleId: module.id,
      moduleLabel: module.label,
      symbolName: null,
      modulePath: module.path,
      description: module.annotation?.descriptionLong || module.annotation?.descriptionShort,
      color: request.color,
      sourceText,
      ...pos,
    });
  };
}
