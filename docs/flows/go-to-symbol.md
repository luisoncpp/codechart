# Flow: go to symbol (Search ▾ → Go to symbol)

1. **Trigger** - choose **Search ▾ → Go to symbol** in the toolbar. There is no dedicated keyboard shortcut.
2. **Entry point** - the always-mounted `ProjectSearch` bar, opened with `CanvasUiState.findBarMode = "symbols"`.
3. **Step-by-step sequence**
   1. Typing runs `useSymbolSearch` synchronously from the first character; an empty query clears results.
   2. `GraphSessionStore.searchExportedSymbols(query)` filters the visible graph (the full graph, or `filterTestModules(graph)` while **Hide tests** is on).
   3. A module is included once when any `exportedSymbols` entry contains the case-insensitive query. The graph data includes locally declared exports and re-exported names, so the same symbol can produce results in its implementation and facade files.
   4. The bar shows `N of M` or `No results`. `Enter`/Down goes next; `Shift+Enter`/Up goes previous, wrapping around through the matching modules.
   5. Navigation calls `moveGuard.begin()` and `store.focusOn(module.id)` to select, expand ancestors, and center the module. It does not open a preview.
   6. `Esc`/Close closes and clears; a store `phase-changed` also closes and clears stale results.
4. **Reads** - `GraphSessionStore.graph`, `hideTests`, and each module's `exportedSymbols`. No disk or IPC reads.
5. **Writes** - selection history, selected module, and focus request through `focusOn`; no persisted search state.
6. **Side effects** - viewport pan per jump; possible async re-layout when collapsed ancestors expand.
7. **Files to inspect** - `project_search/{ProjectSearch,ProjectSearchBar,use-symbol-search}.tsx`, `canvas-ui-state.ts`, `SearchMenu.tsx`, and `graph-session-store.ts` (`searchExportedSymbols`).
8. **Common failure modes** - results are based on the last analyzed graph, not unsaved source text; **Hide tests** changes the visible scope and stale results are invalidated on project phase changes; matching is substring-based, so a query can also match longer exported names such as `ITodoStore` when searching for `TodoStore`.
