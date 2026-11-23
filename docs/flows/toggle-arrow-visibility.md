# Flow: toggle arrow visibility

1. **Trigger** — user clicks **View ▾** in the toolbar, opens the **Arrow visibility ▸** submenu on the right, and selects a radio option (*Show all*, *Hide arrow heads for non-selected modules*, or *Hide entire arrows for non-selected modules*).

2. **Entry point** — `MenuRadioItem.onSelect` in `features/graph_canvas/Private/toolbar/ViewMenu.tsx`.
3. **Sequence**
   1. `ViewMenu` calls `ui.setArrowVisibility(visibility)` on `CanvasUiState`.
   2. `CanvasUiState` stores the selected option (`"all" | "hide-non-selected-heads" | "hide-non-selected-arrows"`) and notifies listeners via `emit()`.
   3. `GraphCanvas` (subscribed via `useCanvasUiState(ui)`) re-renders:
      - Reads `uiState.getArrowVisibility()`.
      - Calls `useStyledEdges(displayProjected, edgeFocus, arrowVisibility)`:
        - `all`: styles all edges with `markerEnd: ArrowClosed` (unless diff-removed).
        - `hide-non-selected-heads`: sets `markerEnd: undefined` on edges not connected to the active `edgeFocus`.
        - `hide-non-selected-arrows`: returns `null` for edges not connected to `edgeFocus`, completely filtering them out.
   4. `EdgeLayer` receives updated `edges` prop and triggers `rebuildFromGeometry()`, rebuilding static edge model and updating the SVG paths.
4. **Reads** — `CanvasUiState.getArrowVisibility()`, `GraphSessionStore.getSelectedId()`, `displayProjected`.
5. **Writes** — `CanvasUiState.arrowVisibility`.
6. **Side effects** — none (no layout recalculation, no IPC, pure view chrome update).
7. **Files** — `ViewMenu.tsx`, `canvas-ui-state.ts`, `GraphCanvas.tsx`, `use-styled-edges.ts`, `edge-style.ts`, `edge-path.ts`, `viewport-edge-bucket.ts`, `EdgeLayer.tsx`.
8. **Common failure modes** — when no module is selected (`edgeFocus` is null), non-selected options treat all edges as non-connected (hiding all arrowheads or all arrows until a node is selected).

## Variant: Hide arrows between off-screen modules (checkbox, default on)

1. **Trigger** — same submenu, checkbox below the radios.
2. **Sequence** — `ui.setHideOffscreenArrows(hide)` → emit → `GraphCanvas` passes `hideOffscreenArrows` to `EdgeLayer` → its effect calls `controller.rebuildFromGeometry()` → `renderer.setHideOffscreenArrows` → `buildStaticEdgeModel(cache, viewport, hide)` culls with `filterSegmentsWithVisibleEndpoint` (source box or target/group box must hit the tight screen rect).
3. **While panning** — `scheduleViewportFlush` (rAF) only applies arrow-LOD flips; a clip-cell change schedules `rebuildClippedModel` via `scheduleIdle` (`schedule-idle.ts`), so the endpoint test re-runs about every half screen of pan, off the input path; plus one forced idle settle rebuild 150ms after the camera stops (`scheduleSettleRebuild`).
4. **Files** — `canvas-ui-state.ts`, `ViewMenu.tsx`, `EdgeLayer.tsx`, `edge-layer-controller.ts`, `edge-layer-renderer.ts`, `viewport-edge-model.ts`, `edge-viewport.ts`, `edge-path.ts` (`sourceBox`/`targetBox`), `schedule-idle.ts`.
5. **Failure modes** — while panning, a module that scrolled in since the last rebuild has no edges until the next clip cell (≤ ½ screen of pan) or until the camera stops (150ms + idle).

## Variant: Show violation arrows (red) (checkbox, default on)

1. **Trigger** — same submenu, last checkbox.
2. **Sequence** — `ui.setShowViolationArrows(show)` → emit → `GraphCanvas` passes `{ arrowVisibility, showViolationArrows }` to `useStyledEdges` → `styleEdges` (`edge-style.ts`) skips every edge whose focus-free `edgeRole` is `"violation"` before `styleEdge` → `EdgeLayer` rebuilds.
3. **Rules** — hidden edges are dropped even when they touch the selection (by design: "remove always"); diff-overlay edges (`diffState` set) are never violation-role, so they stay. Diagnostics, the inspector, and the architecture-issues chip are unaffected.
4. **Files** — `canvas-ui-state.ts`, `ViewMenu.tsx`, `GraphCanvas.tsx`, `use-styled-edges.ts`, `edge-style.ts`.
