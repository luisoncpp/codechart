// @Architecture(descriptionShort="Opens in-memory markdown (e.g. a Review Stack cohort explanation) in a pinned preview frame")
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import { computePointWidgetPosition } from "./frame-placement";
import { DOCUMENT_FRAME_HEIGHT, openFrame, type PreviewFrame } from "./frame-list";

interface MarkdownFrameRequest {
  /** Stable identity: reopening the same key raises and refreshes the open frame. */
  key: string;
  title: string;
  markdown: string;
}

interface MarkdownFrameDeps {
  containerRef: RefObject<HTMLDivElement | null>;
  nextId: MutableRefObject<number>;
  setFrames: Dispatch<SetStateAction<readonly PreviewFrame[]>>;
}

const EXPLANATION_COLOR = "#7c3aed";

/**
 * The frame is pinned: an explanation is read while panning to the code it
 * describes, and an unpinned frame closes on the first canvas move.
 */
export function createMarkdownFramePreview(deps: MarkdownFrameDeps) {
  const { containerRef, nextId, setFrames } = deps;
  return (request: MarkdownFrameRequest) => {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    // Top-right (clamped inside the canvas): code previews open top-left, so
    // an explanation and the code it describes sit side by side.
    const pos = computePointWidgetPosition(
      { x: bounds.right, y: bounds.top + 24 },
      bounds,
      DOCUMENT_FRAME_HEIGHT,
    );
    setFrames((previous) =>
      openFrame(previous, {
        moduleId: request.key,
        moduleLabel: request.title,
        symbolName: null,
        // Root-level virtual path: repo-relative `[[links]]` resolve from the project root.
        modulePath: `${request.key.replace(/[^\w.-]+/g, "_")}.md`,
        color: EXPLANATION_COLOR,
        sourceText: request.markdown,
        isMarkdown: true,
        height: DOCUMENT_FRAME_HEIGHT,
        pinned: true,
        ...pos,
        id: nextId.current++,
      }),
    );
  };
}
