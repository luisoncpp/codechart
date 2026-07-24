// @Architecture(descriptionShort="Opens and focuses Review Note document previews")
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { GraphSessionStore } from "../../../../state/graph-session";
import { computePointWidgetPosition } from "./frame-placement";
import { openFrame, type PreviewFrame } from "./frame-list";

export interface ReviewPreviewRequest {
  path: string;
  startLine: number;
  endLine: number;
}

interface ReviewPreviewDeps {
  containerRef: RefObject<HTMLDivElement | null>;
  store: GraphSessionStore;
  nextId: MutableRefObject<number>;
  setFrames: Dispatch<SetStateAction<readonly PreviewFrame[]>>;
}

export function createReviewNotePreview(deps: ReviewPreviewDeps) {
  const { containerRef, store, nextId, setFrames } = deps;
  return async (request: ReviewPreviewRequest) => {
    const container = containerRef.current;
    const module = store.getGraph()?.modules.find((item) => item.path === request.path);
    if (!container || !module) return;
    const sourceText = await store.fetchModuleSource(module.id);
    const bounds = container.getBoundingClientRect();
    const pos = computePointWidgetPosition(
      { x: bounds.left + 24, y: bounds.top + 24 },
      bounds,
    );
    const activeRange = { startLine: request.startLine, endLine: request.endLine };
    setFrames((previous) => {
      const existing = previous.find(
        (frame) => frame.moduleId === module.id && frame.symbolName === null,
      );
      if (existing) {
        const updated = previous.map((frame) =>
          frame.id === existing.id ? { ...frame, activeRange } : frame,
        );
        return openFrame(updated, { ...existing, activeRange, id: existing.id });
      }
      return openFrame(previous, {
        moduleId: module.id,
        moduleLabel: module.label,
        symbolName: null,
        modulePath: module.path,
        description: module.annotation?.descriptionLong || module.annotation?.descriptionShort,
        color: "#64748b",
        sourceText,
        activeRange,
        pinned: false,
        ...pos,
        id: nextId.current++,
      });
    });
  };
}
