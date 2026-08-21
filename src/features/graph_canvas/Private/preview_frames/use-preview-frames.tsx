// @Architecture(descriptionShort="Hook adapter owning preview frame state, placement, and close-on-outside-click")
import { useCallback, useMemo, useRef, useState } from "react";
import type { Node as FlowNode } from "@xyflow/react";
import type { ProjectGraph } from "../../../../domain/graph";
import type { GraphDiffOverlay } from "../../../../domain/diff";
import type { GraphSessionStore } from "../../../../state/graph-session";
import { type FrameHandlers } from "./SymbolSourceWidget";
import {
  openFrame, bringToFront, moveFrame, togglePin, closeUnpinned, type PreviewFrame,
} from "./frame-list";
import { computePointWidgetPosition, computeWidgetPosition } from "./frame-placement";
import { combinedSymbolTargets, sourcePrefetchIds } from "./imported-symbol-resolver";
import { placeNextToFrame } from "./live-frame-placement";
import { useClosePreviewFrames } from "./use-close-preview-frames";
import { PreviewFramesView } from "./PreviewFramesView";
import { withNewSources } from "./source-cache";
import { createReviewNotePreview } from "./review-note-preview";
import { createWikiLinkPreview } from "./wiki-link-preview";
import { createDocumentPreview } from "./document-preview";
import { useClickableSymbols } from "./use-clickable-symbols";
import type { WikiLinkClick } from "../wiki_links";

interface PreviewFramesDeps {
  store: GraphSessionStore;
  graph: ProjectGraph | null;
  diffOverlay: GraphDiffOverlay | null;
  diffReviewedIds?: ReadonlySet<string>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The live project-search query; a new frame seeds its find bar with it. */
  getFindQuery: () => string;
}

export function usePreviewFrames(deps: PreviewFramesDeps) {
  const { store, graph, diffOverlay, diffReviewedIds, containerRef, getFindQuery } = deps;
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

  const closeTransient = useCallback(() => setFrames((prev) => closeUnpinned(prev)), []);
  const { armOpenGrace, closeIfAllowed } = useClosePreviewFrames(frames.length > 0, closeTransient);

  const open = useCallback(
    (mode: "close-unpinned" | "keep-all", frame: Omit<PreviewFrame, "id" | "zIndex" | "pinned">) => {
      const initialFindQuery = getFindQuery() || undefined;
      armOpenGrace();
      setFrames((prev) => {
        const base = mode === "close-unpinned" ? closeUnpinned(prev) : prev;
        return openFrame(base, { ...frame, pinned: false, initialFindQuery, id: nextId.current++ });
      });
    },
    [armOpenGrace, getFindQuery],
  );

  /** Symbol box clicked inside a module card: open a preview frame next to it. */
  const openFromSymbolNode = useCallback(
    async (node: FlowNode, event: React.MouseEvent) => {
      const symbolEl = (event.target as HTMLElement).closest("[data-symbol-id]");
      const container = containerRef.current;
      if (!symbolEl || !container || !graph || node.type !== "module") return;
      const moduleId = node.id;
      const module = graph.modules.find((m) => m.id === moduleId);
      if (!module) return;
      const sourceText = await store.fetchModuleSource(moduleId);
      const pos = computeWidgetPosition(symbolEl.getBoundingClientRect(), container.getBoundingClientRect());
      const symbolName = symbolEl.getAttribute("data-symbol-name") || "";
      void prefetchSources(moduleId);
      open("close-unpinned", {
        moduleId, moduleLabel: module.label, symbolName, modulePath: module.path,
        color: typeof node.data?.color === "string" ? node.data.color : "#64748b",
        sourceText, ...pos,
      });
    },
    [graph, store, containerRef, open, prefetchSources],
  );

  const openDocumentPreview = useMemo(
    () => createDocumentPreview({ containerRef, store, graph, diffOverlay, open, prefetchSources }),
    [containerRef, store, graph, diffOverlay, open, prefetchSources],
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
        moduleId: target.moduleId, moduleLabel: targetModule.label, symbolName,
        modulePath: target.path, color: "#64748b", sourceText, ...pos,
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
      onToggleDiffReview: (moduleId) => store.toggleDiffReviewed(moduleId),
      onNavigate: openFromSymbolClick,
      onOpenWikiLink: (frameId: number, link: WikiLinkClick) =>
        void wikiLink.openLink({ link, anchor: { frameId } }),
    }),
    [openFromSymbolClick, store, wikiLink],
  );

  const clickableByModule = useClickableSymbols(graph, frames, moduleSources);

  return {
    openFromSymbolNode,
    openDocumentPreview,
    openReviewNotePreview,
    openWikiLinkFromEvent: wikiLink.openFromEvent,
    closeTransient: closeIfAllowed,
    framesView: (
      <PreviewFramesView
        frames={frames}
        clickableByModule={clickableByModule}
        diffOverlay={diffOverlay}
        diffReviewedIds={diffReviewedIds}
        handlers={handlers}
      />
    ),
  };
}


