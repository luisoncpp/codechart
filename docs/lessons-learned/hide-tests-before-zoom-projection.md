# Hide-tests must run on the full graph before zoom projection

**Context:** "Hide tests" filters test modules out of the visible graph and triggers a re-layout.
L0 zoom collapses every group for **projection only** (scroll zoom does not re-layout).

**The trap:** applying `filterTestModules` *after* `projectForZoom` at L0. Collapse already hides
grouped modules, so the filter sees empty groups and drops every group box. A re-layout on that
shrunk graph then sticks — zooming back to L1 still projects from a layout that lost the module
boxes until reload.

**The fix:** in `GraphSessionStore`, always `filterTestModules(fullGraph)` first, then
`projectForZoom` for the display/reduced graph. Layout uses the test-filtered full graph at L0
(projection hides modules); at L1+ it also applies manual per-group collapse before ELK.

**Counter-intuitive takeaway:** graph reducers that drop "empty" containers must run while module
membership is still visible. Zoom collapse is a view transform — do not feed its already-hidden
graph into filters that infer emptiness.
