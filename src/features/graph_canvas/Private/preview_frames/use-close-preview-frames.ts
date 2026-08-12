import { useCallback, useEffect, useRef } from "react";

/**
 * Outside clicks / canvas moves close unpinned frames. Opening a frame arms a
 * short grace period (through the next paint) so the same gesture that opened
 * it (menu click-through onto the pane, or React Flow `onMoveStart`) cannot
 * dismiss it immediately — needed when a pinned frame already kept this
 * listener attached.
 */
export function useClosePreviewFrames(active: boolean, closeUnpinned: () => void) {
  const suppressRef = useRef(false);
  const clearGraceHandleRef = useRef<number | null>(null);

  const cancelPendingClear = useCallback(() => {
    if (clearGraceHandleRef.current === null) return;
    cancelAnimationFrame(clearGraceHandleRef.current);
    clearGraceHandleRef.current = null;
  }, []);

  const armOpenGrace = useCallback(() => {
    suppressRef.current = true;
    cancelPendingClear();
    const firstFrame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(() => {
        suppressRef.current = false;
        clearGraceHandleRef.current = null;
      });
      clearGraceHandleRef.current = secondFrame;
    });
    clearGraceHandleRef.current = firstFrame;
  }, [cancelPendingClear]);

  const closeIfAllowed = useCallback(() => {
    if (suppressRef.current) return;
    closeUnpinned();
  }, [closeUnpinned]);

  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      // [data-preview-keep] opts UI (e.g. the find bar) out of close-on-outside-click.
      if ((e.target as Element | null)?.closest?.("[data-preview-keep]")) return;
      const widgets = document.querySelectorAll(".symbol-widget");
      for (const widget of widgets) {
        if (widget.contains(e.target as globalThis.Node)) return;
      }
      closeIfAllowed();
    };
    const timer = setTimeout(/*attachAfterOpeningClick*/ () => {
      document.addEventListener("click", handler);
    }, /*delayInMs=*/0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [active, closeIfAllowed]);

  return { armOpenGrace, closeIfAllowed };
}
