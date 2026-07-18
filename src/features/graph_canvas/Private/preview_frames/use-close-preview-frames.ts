import { useEffect } from "react";

/** Any click landing outside every open frame closes them all. */
export function useClosePreviewFrames(active: boolean, closeAll: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      // [data-preview-keep] opts UI (e.g. the find bar) out of close-on-outside-click.
      if ((e.target as Element | null)?.closest?.("[data-preview-keep]")) return;
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
