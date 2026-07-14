// @Architecture(descriptionShort="Hook adapter owning preview frame state, placement, and close-on-outside-click")
import { useCallback, useMemo, useRef, useState } from "react";
import type { Node as FlowNode } from "@xyflow/react";
import type { ProjectGraph } from "../../../../domain/graph";
import type { GraphDiffOverlay } from "../../../../domain/diff";
import type { GraphSessionStore } from "../../../../state/graph-session";
import { SymbolSourceWidget, type FrameHandlers } from "./SymbolSourceWidget";
import { openFrame, bringToFront, moveFrame, type PreviewFrame } from "./frame-list";
import {
  computePointWidgetPosition,
  computeWidgetPosition,
} from "./frame-placement";
import { combinedSymbolTargets, sourcePrefetchIds } from "./imported-symbol-resolver";
import { placeNextToFrame } from "./live-frame-placement";
import { useClosePreviewFrames } from "./use-close-preview-frames";

interface PreviewFramesDeps {
  store: GraphSessionStore;
  graph: ProjectGraph | null;
  diffOverlay: GraphDiffOverlay | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface DocumentPreviewRequest {
  moduleId: string;
  color: string;
  x: number;
  y: number;
}

export function usePreviewFrames(deps: PreviewFramesDeps) {
  const { store, graph, diffOverlay, containerRef } = deps;
  const [frames, setFrames] = useState<readonly PreviewFrame[]>([]);
  const [moduleSources, setModuleSources] = useState<ReadonlyMap<string, string>>(new Map());
  const nextId = useRef(1);

  /** Warm sources for a module + its imports so function/method names resolve. */
  const prefetchSources = useCallback(
    async (moduleId: string) => {
      if (!graph) return;
      const entries = await Promise.all(
        sourcePrefetchIds(graph, moduleId).map(
          async (id) => [id, await store.fetchModuleSource(id)] as const,
        ),
      );
      setModuleSources((prev) => withNewSources(prev, entries));
    },
    [graph, store],
  );

  const open = useCallback(
    (base: readonly PreviewFrame[], frame: Omit<PreviewFrame, "id" | "zIndex">) => {
      setFrames(openFrame(base, { ...frame, id: nextId.current++ }));
    },
    [],
  );

  /** Symbol node clicked on the canvas: replace all frames with one next to it. */
  const openFromSymbolNode = useCallback(
    async (node: FlowNode, event: React.MouseEvent) => {
      const symbolEl =
        (event.target as HTMLElement).closest(".symbol-box") ||
        (event.target as HTMLElement).closest(".react-flow__node-symbol");
      const container = containerRef.current;
      if (!symbolEl || !container || !graph) return;
      const moduleId = node.parentId!;
      const module = graph.modules.find((m) => m.id === moduleId);
      if (!module) return;
      const sourceText = await store.fetchModuleSource(moduleId);
      const pos = computeWidgetPosition(
        symbolEl.getBoundingClientRect(),
        container.getBoundingClientRect(),
      );
      const symbolName = (node.data?.label as string) || "";
      void prefetchSources(moduleId);
      open(/*base=*/ [], {
        moduleId,
        moduleLabel: module.label,
        symbolName,
        modulePath: module.path,
        color: typeof node.data?.color === "string" ? node.data.color : "#64748b",
        sourceText,
        ...pos,
      });
    },
    [graph, store, containerRef, open, prefetchSources],
  );

  /** Context-menu action: open the module's complete L2 document at its beginning. */
  const openDocumentPreview = useCallback(
    async (request: DocumentPreviewRequest) => {
      const container = containerRef.current;
      const module = graph?.modules.find((item) => item.id === request.moduleId);
      if (!container || !module) return;
      const sourceText = await store.fetchModuleSource(module.id);
      const pos = computePointWidgetPosition(request, container.getBoundingClientRect());
      void prefetchSources(module.id);
      open(/*base=*/ [], {
        moduleId: module.id,
        moduleLabel: module.label,
        symbolName: null,
        modulePath: module.path,
        description: module.annotation?.descriptionLong || module.annotation?.descriptionShort,
        color: request.color,
        sourceText,
        ...pos,
      });
    },
    [containerRef, graph, open, prefetchSources, store],
  );

  /** Clickable symbol (import, function, or method) clicked inside a frame. */
  const openFromSymbolClick = useCallback(
    async (sourceFrameId: number, symbolName: string) => {
      const container = containerRef.current;
      const sourceFrame = frames.find((f) => f.id === sourceFrameId);
      if (!container || !graph || !sourceFrame) return;
      const target = combinedSymbolTargets(graph, sourceFrame.moduleId, moduleSources).get(symbolName);
      if (!target) return;
      const targetModule = graph.modules.find((item) => item.id === target.moduleId);
      if (!targetModule) return;
      const sourceText = await store.fetchModuleSource(target.moduleId);
      void prefetchSources(target.moduleId);
      const pos = placeNextToFrame(sourceFrameId, container);
      if (!pos) return;
      open(frames, {
        moduleId: target.moduleId,
        moduleLabel: targetModule.label,
        symbolName,
        modulePath: target.path,
        color: "#64748b",
        sourceText,
        ...pos,
      });
    },
    [graph, store, containerRef, frames, open, moduleSources, prefetchSources],
  );

  const closeAll = useCallback(() => setFrames([]), []);

  useClosePreviewFrames(frames.length > 0, closeAll);

  const handlers = useMemo<FrameHandlers>(
    () => ({
      onClose: (id) => setFrames((prev) => prev.filter((f) => f.id !== id)),
      onMove: (id, pos) => setFrames((prev) => moveFrame(prev, id, pos)),
      onActivate: (id) => setFrames((prev) => bringToFront(prev, id)),
      onNavigate: openFromSymbolClick,
    }),
    [openFromSymbolClick],
  );

  const clickableByModule = useMemo(
    /*resolveClickableNamesPerFrameModule*/ () => {
      const byModule = new Map<string, ReadonlySet<string>>();
      if (!graph) return byModule;
      for (const frame of frames) {
        if (byModule.has(frame.moduleId)) continue;
        const targets = combinedSymbolTargets(graph, frame.moduleId, moduleSources);
        byModule.set(frame.moduleId, new Set(targets.keys()));
      }
      return byModule;
    },
    [graph, frames, moduleSources],
  );

  const framesView = (
    <>
      {frames.map((frame) => (
        <SymbolSourceWidget
          key={frame.id}
          frame={frame}
          clickableSymbols={clickableByModule.get(frame.moduleId) ?? EMPTY_NAMES}
          fileDiff={diffOverlay?.lineDiffByPath.get(frame.modulePath)}
          handlers={handlers}
        />
      ))}
    </>
  );

  return { openFromSymbolNode, openDocumentPreview, closeAll, framesView };
}

const EMPTY_NAMES: ReadonlySet<string> = new Set();

/** Merge fetched sources; returns the previous map untouched when nothing is new. */
function withNewSources(
  prev: ReadonlyMap<string, string>,
  entries: readonly (readonly [string, string])[],
): ReadonlyMap<string, string> {
  const fresh = entries.filter(([id, text]) => text && prev.get(id) !== text);
  if (fresh.length === 0) return prev;
  const next = new Map(prev);
  for (const [id, text] of fresh) next.set(id, text);
  return next;
}
