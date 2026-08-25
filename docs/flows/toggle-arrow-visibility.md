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
