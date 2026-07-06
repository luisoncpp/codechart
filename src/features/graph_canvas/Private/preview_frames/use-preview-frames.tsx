// @Architecture(descriptionShort="Hook adapter owning preview frame state, placement, and close-on-outside-click")
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Node as FlowNode } from "@xyflow/react";
import type { ProjectGraph } from "../../../../domain/graph";
import type { GraphDiffOverlay } from "../../../../domain/diff";
import type { GraphSessionStore } from "../../../../state/graph-session";
import { SymbolSourceWidget, type FrameHandlers } from "./SymbolSourceWidget";
import { openFrame, bringToFront, moveFrame, type PreviewFrame } from "./frame-list";
import { computeWidgetPosition, placeAdjacentFrame, type FrameRect, type Position } from "./frame-placement";
import { importedSymbolTargets } from "./imported-symbol-resolver";

interface PreviewFramesDeps {
  store: GraphSessionStore;
  graph: ProjectGraph | null;
  diffOverlay: GraphDiffOverlay | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/** Container-relative live boxes of every rendered frame (honors user resizes/drags). */
function liveFrameRects(container: HTMLElement): Map<number, FrameRect> {
  const containerBox = container.getBoundingClientRect();
  const rects = new Map<number, FrameRect>();
  for (const el of container.querySelectorAll<HTMLElement>("[data-frame-id]")) {
    const box = el.getBoundingClientRect();
    rects.set(Number(el.dataset.frameId), {
      top: box.top - containerBox.top,
      left: box.left - containerBox.left,
      width: box.width,
      height: box.height,
    });
  }
  return rects;
}

export function usePreviewFrames(deps: PreviewFramesDeps) {
  const { store, graph, diffOverlay, containerRef } = deps;
  const [frames, setFrames] = useState<PreviewFrame[]>([]);
  const nextId = useRef(1);

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
      open(/*base=*/ [], { moduleId, symbolName, modulePath: module.path, sourceText, ...pos });
    },
    [graph, store, containerRef, open],
  );

  /** Imported symbol clicked inside a frame: open its module next to that frame. */
  const openFromImport = useCallback(
    async (sourceFrameId: number, symbolName: string) => {
      const container = containerRef.current;
      const sourceFrame = frames.find((f) => f.id === sourceFrameId);
      if (!container || !graph || !sourceFrame) return;
      const target = importedSymbolTargets(graph, sourceFrame.moduleId).get(symbolName);
      if (!target) return;
      const sourceText = await store.fetchModuleSource(target.moduleId);
      const pos = placeNextTo(sourceFrameId, container);
      if (!pos) return;
      open(frames, { moduleId: target.moduleId, symbolName, modulePath: target.path, sourceText, ...pos });
    },
    [graph, store, containerRef, frames, open],
  );

  const closeAll = useCallback(() => setFrames([]), []);

  useCloseOnOutsideClick(frames.length > 0, closeAll);

  const handlers = useMemo<FrameHandlers>(
    () => ({
      onClose: (id) => setFrames((prev) => prev.filter((f) => f.id !== id)),
      onMove: (id, pos) => setFrames((prev) => moveFrame(prev, id, pos)),
      onActivate: (id) => setFrames((prev) => bringToFront(prev, id)),
      onNavigate: openFromImport,
    }),
    [openFromImport],
  );

  const framesView = (
    <>
      {frames.map((frame) => (
        <SymbolSourceWidget
          key={frame.id}
          frame={frame}
          clickableSymbols={clickableSymbolsFor(graph, frame.moduleId)}
          fileDiff={diffOverlay?.lineDiffByPath.get(frame.modulePath)}
          handlers={handlers}
        />
      ))}
    </>
  );

  return { openFromSymbolNode, closeAll, framesView };
}

function placeNextTo(anchorFrameId: number, container: HTMLElement): Position | null {
  const rects = liveFrameRects(container);
  const anchor = rects.get(anchorFrameId);
  if (!anchor) return null;
  const containerSize = { width: container.clientWidth, height: container.clientHeight };
  return placeAdjacentFrame(anchor, [...rects.values()], containerSize);
}

function clickableSymbolsFor(
  graph: ProjectGraph | null,
  moduleId: string,
): ReadonlySet<string> {
  if (!graph) return new Set();
  return new Set(importedSymbolTargets(graph, moduleId).keys());
}

/** Any click landing outside every open frame closes them all. */
function useCloseOnOutsideClick(active: boolean, closeAll: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      const widgets = document.querySelectorAll(".symbol-widget");
      for (const widget of widgets) {
        if (widget.contains(e.target as globalThis.Node)) return;
      }
      closeAll();
    };
    const timer = setTimeout(/*attachAfterOpeningClick*/ () => {
      document.addEventListener("click", handler);
    }, /*delayInMs=*/0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [active, closeAll]);
}
