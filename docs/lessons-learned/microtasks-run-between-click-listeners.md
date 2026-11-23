# Microtasks run between the listeners of one real click

**Symptom:** clicking a file in the Review Stack drawer (or a note in the Review Notes tab) selected and centered the module, but its preview frame never stayed open. `navigate_to` over MCP opened the same frame fine, and a jsdom test of the click passed.

**What actually happens:** a real (trusted) click dispatches to React's root listener, then to the `document` listener that closes unpinned frames on outside clicks. The browser runs a **microtask checkpoint after each listener returns**. The sidebar's open path was promises only: `focusOn` plus a cached `fetchModuleSource`. So it finished *inside* that checkpoint, and the same click's `document` handler then closed the new frame as an "outside click". Traces showed the frame opening ~100 ms before the close handler of the click that requested it.

**Why tests missed it:** `element.dispatchEvent(...)` from script (jsdom's `fireEvent`, or `eval_js` in the playtest) keeps the JS stack non-empty, so **no microtask checkpoint happens between listeners**. Script-dispatched clicks can't reproduce the bug. Only a trusted click, e.g. the playtest MCP `click` (CDP `Input.dispatchMouseEvent`), shows it.

**Rules:**
- Any opener that a click can trigger, directly or through a store request, must arm the open grace (`armOpenGrace`) **before its first `await`**. The wiki-link opener already did this; `createReviewNotePreview` (shared by both sidebars) did not.
- To unit-test the race, call the opener, `await` it, then dispatch the `document` click yourself (see `tests/sidebar-preview-survives-opening-click.test.tsx`).
- Debug suspected listener-order races with a trusted click plus timestamped `console.warn` traces, not with `dispatchEvent`.
- In the playtest WebView, `requestAnimationFrame` may stall while the window isn't painting; use `setInterval` for timing probes. The playtest `drag` also doesn't drive pointer-capture resize handles (neither the inspector's nor the drawer's), so test those with page-dispatched `PointerEvent`s, which keep `clientX` in WebView2.
