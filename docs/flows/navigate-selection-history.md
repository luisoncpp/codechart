# Flow: navigate inspector selection history

1. **Trigger** — click the top-left back/forward button or press `Alt+Left` / `Alt+Right`.
2. **Entry point** — `SelectionNavigation` in `features/graph_canvas/Private/SelectionNavigation.tsx`.
3. **Sequence**
   1. The control checks `GraphSessionStore.canGoBack()` / `canGoForward()`.
   2. `goBack()` / `goForward()` moves the history pointer without changing its entries.
   3. The store selects the pointed-to module or group, expands hidden module ancestors, and emits `selection-changed` plus `focus-requested`.
   4. `FocusNode` centers the canvas on the selected module or group.
4. **Writes** — `selectedId`, history pointer, and focus request sequence.
5. **Reset** — loading a project clears selection history.
