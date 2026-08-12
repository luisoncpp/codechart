# Pinned frames keep the outside-click listener armed across opens

## Context

`useClosePreviewFrames` attaches a document `click` listener with `setTimeout(0)` so the click that *opens* the first frame cannot immediately dismiss it. That grace only runs when going from zero frames to one (`active` flips true).

## What was learned

- A **pinned** frame keeps `frames.length > 0`, so the listener stays attached. Opening a second preview from the module context menu therefore runs under a live outside-click / canvas `onMoveStart` dismiss path.
- Unmounting the context menu during its own `click` handler can let the gesture fall through onto the React Flow pane. With a **cached** module source, `openDocumentPreview` finishes in a microtask and the new unpinned frame appears in time to be closed by that fall-through — the first open often survives because a cold fetch is slower than the gesture.
- Fixes that compose: mark the menu `data-preview-keep`, defer menu unmount one tick, and arm a close grace whenever a frame is opened (`armOpenGrace`), not only on the 0→1 transition. Grace must last through the next paint (double `requestAnimationFrame`), not a single `setTimeout(0)` — the deferred menu unmount and React Flow `onMoveStart` can both land after one macrotask.
- During **diff inspection**, `applyDiffSources` pre-fills `sourceCache` from `afterSourceByPath`, so reopening a document preview is always the fast (microtask) path and this race is easy to hit.

## Rule of thumb

If a dismiss-on-outside listener is gated by “anything still open,” every *open* path needs the same opening-gesture grace the first open got from the attach delay — pinning makes that the steady state. One macrotask is not enough when the menu also defers unmount; grace should cover through paint.
