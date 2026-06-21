# Scroll-driven detail level + re-layout + auto-fit is a feedback loop

**Context:** Phase 10 semantic zoom. The detail level (L0/L1/L2) is derived from React Flow's
continuous zoom factor (`levelFromZoom`), and changing level collapses/expands groups, which
**re-lays-out** the (now different) node set.

**The trap:** if you *also* auto-`fitView` after a level change, the fit changes the zoom factor,
which `onMoveEnd` reads and maps back to a level — so the fit can kick you into a *different* level,
which re-fits, and so on. Concretely: collapsing to L0 leaves ~3 small boxes; fitting them zoomed the
camera back **in** past the L2 threshold → the app jumped straight from L0 to L2 on a single
`setZoomLevel(0)`. The clamped-per-level fit (`fitView({maxZoom})`) did **not** save it reliably.

**The fix:** make `fitView` a **once-per-load** action, never a per-level action. The level is the
camera's job (scroll), so nothing programmatic should move the camera once the user is driving it.
`FitView` fits the first time nodes measure and then never again; the canvas remounts per project load
(`App` renders it only when `ready`), so once-per-mount = once-per-load. On a level change the graph
re-lays-out under the **current** camera — positions shift but the zoom (and thus the level) stays put.

**Also worth keeping:**
- Re-layout on collapse is async (elkjs). Guard it with a **sequence counter** so a stale layout from
  rapid scrolling can't overwrite a newer one.
- This only surfaced in the **browser preview**, not in jsdom (React Flow doesn't run zoom/measurement
  under jsdom). Unit tests passed while the real interaction oscillated — verify camera-coupled
  behavior in a real browser.

**Counter-intuitive takeaway:** when a value is both an *input* to the camera and *derived from* the
camera, never let the system write that value programmatically — only the user (scroll) should.
