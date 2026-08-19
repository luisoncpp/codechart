// @Architecture(descriptionShort="Hook adapter owning preview frame state, placement, and close-on-outside-click")
import { useCallback, useMemo, useRef, useState } from "react";
import type { Node as FlowNode } from "@xyflow/react";
import type { ProjectGraph } from "../../../../domain/graph";
import type { GraphDiffOverlay } from "../../../../domain/diff";
import type { GraphSessionStore } from "../../../../state/graph-session";
import { type FrameHandlers } from "./SymbolSourceWidget";
import {
  openFrame,
  bringToFront,
  moveFrame,
  togglePin,
  closeUnpinned,
  type PreviewFrame,
} from "./frame-list";
import { computePointWidgetPosition, computeWidgetPosition } from "./frame-placement";
import { combinedSymbolTargets, sourcePrefetchIds } from "./imported-symbol-resolver";
import { placeNextToFrame } from "./live-frame-placement";
import { useClosePreviewFrames } from "./use-close-preview-frames";
import { PreviewFramesView } from "./PreviewFramesView";
import { withNewSources } from "./source-cache";
import { createReviewNotePreview } from "./review-note-preview";
import { createWikiLinkPreview } from "./wiki-link-preview";
import { useClickableSymbols } from "./use-clickable-symbols";
import type { WikiLinkClick } from "../wiki_links";

interface PreviewFramesDeps {
  store: GraphSessionStore;
  graph: ProjectGraph | null;
  diffOverlay: GraphDiffOverlay | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The live project-search query; a new frame seeds its find bar with it. */
  getFindQuery: () => string;
}

interface DocumentPreviewRequest {
  moduleId: string;
  color: string;
  x: number;
  y: number;
}

export function usePreviewFrames(deps: PreviewFramesDeps) {
  const { store, graph, diffOverlay, containerRef, getFindQuery } = deps;
  const [frames, setFrames] = useState<readonly PreviewFrame[]>([]);
  const [moduleSources, setModuleSources] = useState<ReadonlyMap<string, string>>(new Map());
  const nextId = useRef(1);

  const framesRef = useRef(frames);
  framesRef.current = frames;

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

  const closeTransient = useCallback(
    () => setFrames((previous) => closeUnpinned(previous)),
    [],
  );

  const { armOpenGrace, closeIfAllowed } = useClosePreviewFrames(
    frames.length > 0,
    closeTransient,
  );

  const open = useCallback(
    (
      mode: "close-unpinned" | "keep-all",
      frame: Omit<PreviewFrame, "id" | "zIndex" | "pinned">,
    ) => {
      const initialFindQuery = getFindQuery() || undefined;
      armOpenGrace();
      setFrames((prev) => {
        const base = mode === "close-unpinned" ? closeUnpinned(prev) : prev;
        return openFrame(base, {
          ...frame,
          pinned: false,
          initialFindQuery,
          id: nextId.current++,
        });
      });
    },
    [armOpenGrace, getFindQuery],
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
      open("close-unpinned", {
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
      open("close-unpinned", {
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

  const openReviewNotePreview = useMemo(
    () => createReviewNotePreview({ containerRef, store, nextId, setFrames }),
    [containerRef, store],
  );

  /** Both link entry points: inside a frame, and on the canvas itself. */
  const wikiLink = useMemo(
    () => createWikiLinkPreview({ containerRef, store, open, armGrace: armOpenGrace }),
    [containerRef, store, open, armOpenGrace],
  );

  /** Clickable symbol (import, function, or method) clicked inside a frame. */
  const openFromSymbolClick = useCallback(
    async (sourceFrameId: number, symbolName: string) => {
      const container = containerRef.current;
      const sourceFrame = framesRef.current.find((f) => f.id === sourceFrameId);
      if (!container || !graph || !sourceFrame) return;
      const target = combinedSymbolTargets(graph, sourceFrame.moduleId, moduleSources).get(symbolName);
      if (!target) return;
      const targetModule = graph.modules.find((item) => item.id === target.moduleId);
      if (!targetModule) return;
      const sourceText = await store.fetchModuleSource(target.moduleId);
      void prefetchSources(target.moduleId);
      const containerBox = container.getBoundingClientRect();
      const pos = placeNextToFrame(sourceFrameId, container) ?? computePointWidgetPosition(
        { x: containerBox.left + 24, y: containerBox.top + 24 },
        containerBox,
      );
      open("keep-all", {
        moduleId: target.moduleId,
        moduleLabel: targetModule.label,
        symbolName,
        modulePath: target.path,
        color: "#64748b",
        sourceText,
        ...pos,
      });
    },
    [graph, store, containerRef, open, moduleSources, prefetchSources],
  );

  const handlers = useMemo<FrameHandlers>(
    () => ({
      onClose: (id) => setFrames((prev) => prev.filter((f) => f.id !== id)),
      onMove: (id, pos) => setFrames((prev) => moveFrame(prev, id, pos)),
      onActivate: (id) => setFrames((prev) => bringToFront(prev, id)),
      onTogglePin: (id) => setFrames((prev) => togglePin(prev, id)),
      onNavigate: openFromSymbolClick,
      onOpenWikiLink: (frameId: number, link: WikiLinkClick) =>
        void wikiLink.openLink({ link, anchor: { frameId } }),
    }),
    [openFromSymbolClick, wikiLink],
  );

  const clickableByModule = useClickableSymbols(graph, frames, moduleSources);

  return {
    openFromSymbolNode,
    openDocumentPreview,
    openReviewNotePreview,
    openWikiLinkFromEvent: wikiLink.openFromEvent,
    closeTransient: closeIfAllowed,
    framesView: <PreviewFramesView frames={frames} clickableByModule={clickableByModule} diffOverlay={diffOverlay} handlers={handlers} />,
  };
}
