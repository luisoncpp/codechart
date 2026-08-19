// @Architecture(descriptionShort="Pure operations over the list of open preview frames")

/** One open source-preview frame on the canvas overlay. */
export interface PreviewFrame {
  id: number;
  /** A module id, or — for a wiki-link destination that is not a module — its path. */
  moduleId: string;
  moduleLabel: string;
  /** Null means the frame shows the complete L2 document from its beginning. */
  symbolName: string | null;
  modulePath: string;
  description?: string;
  color: string;
  sourceText: string;
  top: number;
  left: number;
  zIndex: number;
  pinned: boolean;
  activeRange?: { startLine: number; endLine: number };
  /** Seeds the in-frame find bar (open + pre-filled) when set, e.g. from project search. */
  initialFindQuery?: string;
  /** Render `sourceText` as markdown (with a raw-source toggle) instead of code rows. */
  isMarkdown?: boolean;
  /** Set when the destination could not be read; shown instead of a body. */
  loadError?: string;
  /** Normalized heading id for rendered-markdown section scroll. */
  sectionAnchor?: string;
}

/** A frame before the hook stamps its identity and pin state. */
export type NewPreviewFrame = Omit<PreviewFrame, "id" | "zIndex" | "pinned">;

/** Whether opening this frame dismisses the other transient frames. */
export type OpenFrameMode = "close-unpinned" | "keep-all";

export type OpenPreviewFrame = (mode: OpenFrameMode, frame: NewPreviewFrame) => void;

/** Default frame size — must match the `.symbol-widget` CSS box. */
export const FRAME_WIDTH = 680;
export const FRAME_HEIGHT = 360;

function topZIndex(frames: readonly PreviewFrame[]): number {
  return frames.reduce((max, f) => Math.max(max, f.zIndex), 0);
}

function mergeOnDedupe(
  existing: PreviewFrame,
  incoming: Omit<PreviewFrame, "zIndex">,
): PreviewFrame {
  const merged: PreviewFrame = {
    ...existing,
    sourceText: incoming.sourceText,
    isMarkdown: incoming.isMarkdown,
    loadError: incoming.loadError,
  };
  if (incoming.activeRange !== undefined) merged.activeRange = incoming.activeRange;
  if (incoming.sectionAnchor !== undefined) merged.sectionAnchor = incoming.sectionAnchor;
  return merged;
}

/**
 * Append a new frame on top. If a frame for the same module + symbol is
 * already open, merge scroll state and bring that one to the front.
 */
export function openFrame(
  frames: readonly PreviewFrame[],
  frame: Omit<PreviewFrame, "zIndex">,
): readonly PreviewFrame[] {
  const existing = frames.find(
    (f) => f.moduleId === frame.moduleId && f.symbolName === frame.symbolName,
  );
  if (existing) {
    const merged = mergeOnDedupe(existing, frame);
    return bringToFront(
      frames.map((f) => (f.id === existing.id ? merged : f)),
      existing.id,
    );
  }
  return [...frames, { ...frame, zIndex: topZIndex(frames) + 1 }];
}

/**
 * Raise a frame above every other one. Returns the input array unchanged
 * when the frame is already on top, so a state setter bails out instead of
 * re-rendering the whole canvas on every frame pointerdown.
 */
export function bringToFront(
  frames: readonly PreviewFrame[],
  id: number,
): readonly PreviewFrame[] {
  const top = topZIndex(frames);
  const frame = frames.find((f) => f.id === id);
  if (!frame || frame.zIndex === top) return frames;
  return frames.map((f) => (f.id === id ? { ...f, zIndex: top + 1 } : f));
}

/** Reposition a frame (header-bar drag). */
export function moveFrame(
  frames: readonly PreviewFrame[],
  id: number,
  pos: { top: number; left: number },
): readonly PreviewFrame[] {
  return frames.map((f) => (f.id === id ? { ...f, ...pos } : f));
}

/** Toggle whether outside clicks should keep a frame open. */
export function togglePin(
  frames: readonly PreviewFrame[],
  id: number,
): readonly PreviewFrame[] {
  return frames.map((f) => (f.id === id ? { ...f, pinned: !f.pinned } : f));
}

/** Close only transient frames; pinned frames remain in their current order. */
export function closeUnpinned(
  frames: readonly PreviewFrame[],
): readonly PreviewFrame[] {
  const remaining = frames.filter((frame) => frame.pinned);
  return remaining.length === frames.length ? frames : remaining;
}
