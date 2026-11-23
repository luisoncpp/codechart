// @Architecture(descriptionShort="Runs deferrable edge work when the main thread is idle")

/** Upper bound so a continuous pan (no idle frames) still gets its edges. */
const IDLE_DEADLINE_MS = 200;

/** Schedules `callback` in an idle period; returns a cancel function. */
export function scheduleIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(/*run*/ () => callback(), {
      timeout: IDLE_DEADLINE_MS,
    });
    return () => cancelIdleCallback(id);
  }
  // WKWebView (macOS Tauri) has no requestIdleCallback.
  const id = setTimeout(/*run*/ callback, /*delayInMs=*/ 0);
  return () => clearTimeout(id);
}
