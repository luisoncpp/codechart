# Flow: select a module or group on the canvas

1. **Trigger** — user clicks a module or group node in the rendered graph.
2. **Entry point** — `ReactFlow onNodeClick` in `features/graph_canvas/Private/GraphCanvas.tsx`.
3. **Sequence**
   1. `GraphCanvasController.onNodeClick(node)` — modules and groups select; collapse/connection
      affordances toggle instead; symbols select their parent module.
   2. `GraphSessionStore.select(id)` — no-op if unchanged; else sets `selectedId`, emits `selection-changed`.
   3. `useGraphSession` (subscribed to `selection-changed`) re-renders subscribers.
   4. `GraphCanvas` re-maps nodes with `selected: n.id === selectedId` → blue outline on the node,
      and re-styles edges via `styleEdge(edge, edgeFocusForSelection(graph, selectedId))` → imports
      (out of selected) red, exports (into selected) blue, while **every unrelated edge stays at the
      one quiet dim level** (`edgeOpacity`, 0.45). Group selection matches both aggregated group-box
      endpoints (L0) and any module in the group's subtree (L1+).
   5. `InspectionPanel` reads `selectedId` + `graph`, routes to `ModuleInspection` or
      `GroupInspection`, and runs the appropriate selectors.
4. **Reads** — store `graph`, `selectedId`.
5. **Writes** — store `selectedId`.
6. **Side effects** — none (no IPC, no layout recompute; selection is pure UI state).
7. **Files** — `GraphCanvas.tsx`, `graph-canvas-controller.ts`, `graph-session-store.ts`,
   `use-graph-session.ts`, `InspectionPanel.tsx`, `ModuleInspection.tsx`, `GroupInspection.tsx`,
   `selectors.ts`.
8. **Common failure modes** — clicking the pane clears selection (`onPaneClick`); a selection set
   before load is cleared by `loadProject`; clicking a group's collapse or connection toggle does
   not select it.
