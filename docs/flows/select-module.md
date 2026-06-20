# Flow: select a module on the canvas

1. **Trigger** — user clicks a module node in the rendered graph.
2. **Entry point** — `ReactFlow onNodeClick` in `features/graph_canvas/Private/GraphCanvas.tsx`.
3. **Sequence**
   1. `GraphCanvasController.onNodeClick(node)` — ignores non-`module` nodes (groups, pane).
   2. `GraphSessionStore.select(id)` — no-op if unchanged; else sets `selectedId`, emits `selection-changed`.
   3. `useGraphSession` (subscribed to `selection-changed`) re-renders subscribers.
   4. `GraphCanvas` re-maps nodes with `selected: n.id === selectedId` → blue outline on the node,
      and re-styles edges via `styleEdge(edge, selectedId)` → imports (out of selected) red, exports
      (into selected) blue, while **every unrelated edge stays at the one quiet dim level**
      (`edgeOpacity`, 0.45) so the selected edges pop without the rest vanishing.
   5. `InspectionPanel` reads `selectedId` + `graph`, runs selectors (`findModule`, `groupOf`,
      `importsOf`, `importedBy`, `diagnosticsFor`) and renders details.
4. **Reads** — store `graph`, `selectedId`.
5. **Writes** — store `selectedId`.
6. **Side effects** — none (no IPC, no layout recompute; selection is pure UI state).
7. **Files** — `GraphCanvas.tsx`, `graph-canvas-controller.ts`, `graph-session-store.ts`,
   `use-graph-session.ts`, `InspectionPanel.tsx`, `selectors.ts`.
8. **Common failure modes** — clicking the pane clears selection (`onPaneClick`); a selection set
   before load is cleared by `loadProject`; group clicks intentionally do nothing in M1.
