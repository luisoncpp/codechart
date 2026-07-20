// @Architecture(descriptionShort="Pure operations over the list of open preview frames")

/** One open source-preview frame on the canvas overlay. */
export interface PreviewFrame {
  id: number;
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
  activeRange?: { startLine: number; endLine: number };
  /** Seeds the in-frame find bar (open + pre-filled) when set, e.g. from project search. */
  initialFindQuery?: string;
}

/** Default frame size — must match the `.symbol-widget` CSS box. */
export const FRAME_WIDTH = 680;
export const FRAME_HEIGHT = 360;

function topZIndex(frames: readonly PreviewFrame[]): number {
  return frames.reduce((max, f) => Math.max(max, f.zIndex), 0);
}

/**
 * Append a new frame on top. If a frame for the same module + symbol is
 * already open, bring that one to the front instead of duplicating it.
 */
export function openFrame(
  frames: readonly PreviewFrame[],
  frame: Omit<PreviewFrame, "zIndex">,
): readonly PreviewFrame[] {
  const existing = frames.find(
    (f) => f.moduleId === frame.moduleId && f.symbolName === frame.symbolName,
  );
  if (existing) return bringToFront(frames, existing.id);
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
