# Flow: navigate to a module from the inspector

1. **Trigger** — user clicks a module path in the **Imports** or **Imported by** list.
2. **Entry point** — `EdgeList` button in `features/inspection_panel/Private/EdgeList.tsx`.
3. **Sequence**
   1. `InspectionPanel` passes `store.focusOn(moduleId)` into `ModuleInspection` / `GroupInspection`.
   2. `GraphSessionStore.focusOn(moduleId)` — expands collapsed ancestor groups when needed
      (`ensure-node-visible.ts`), sets `selectedId`, bumps a focus sequence counter, emits
      `selection-changed` (when the id changed) and `focus-requested`.
   3. `GraphCanvas` `FocusNode` (inside `ReactFlowProvider`) listens via `useGraphSession`;
      reads the module's **layout** center (absolute ELK coordinates), waits until React Flow's
      pan/zoom (`panZoom`) and pane size are ready, then calls `setCenter` (retries briefly if the
      viewport is not initialized yet).
   4. `InspectionPanel` re-renders for the new selection; edge highlighting follows the usual
      select-module path.
4. **Reads** — store `graph`, `collapsedGroupIds`, `layout`, focus request `{ id, seq }`.
5. **Writes** — store `selectedId`, `collapsedGroupIds` (when expanding), focus sequence.
6. **Side effects** — optional async re-layout when ancestor groups expand; viewport pan/zoom.
7. **Files** — `EdgeList.tsx`, `InspectionPanel.tsx`, `ModuleInspection.tsx`, `GroupInspection.tsx`,
   `graph-session-store.ts`, `focus-viewport.ts`, `FocusNode.tsx`, `GraphCanvas.tsx`.
8. **Common failure modes** — hidden test modules (`hideTests`) are not on the canvas so centering
   may no-op even though selection updates; unknown module ids are ignored by `focusOn`.
