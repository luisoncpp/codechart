# Flow: go to file (Ctrl+P find bar)

1. **Trigger** - press `Ctrl+P` / `Cmd+P` anywhere, or **Search ▾ → Go to file** in the toolbar (`ui.openFindBar("files")`).
2. **Entry point** - the same always-mounted `ProjectSearch` bar as content search (`docs/flows/search-project.md`), opened with `CanvasUiState.findBarMode = "files"`. Switching modes (Ctrl+P ↔ Ctrl+Shift+F) reuses the bar and clears the query.
3. **Step-by-step sequence**
   1. Typing runs `useFileNameSearch` synchronously (no debounce, no minimum length, no IPC): `GraphSessionStore.searchModuleFiles(query)` filters the visible modules (full graph, or `filterTestModules` while **Hide tests** is on) by case-insensitive substring over the file **name** (last path segment) only — never path directories, never content.
   2. Results are the same mode-agnostic `BarResult { paths }` the content mode produces; counter and `Enter`/`Shift+Enter`/arrow navigation via `focusOn` are identical to content search. Never truncated (bounded by module count).
   3. The query is **not** mirrored into `CanvasUiState.setFindQuery` (a file name is not a content query, so previews are not seeded with it).
4. **Reads** - store `graph`, `hideTests`. No disk or IPC.
5. **Writes** - selection/focus via `focusOn` on navigation, as in content search.
6. **Files to inspect** - `project_search/{ProjectSearch,ProjectSearchBar}.tsx`, `use-file-name-search.ts`, `bar-result.ts`, `canvas-ui-state.ts` (`openFindBar`/`findBarMode`), `graph-session-store.ts` (`searchModuleFiles`), `SearchMenu.tsx`.
7. **Common failure modes** - same stale-scope behavior as content search when **Hide tests** toggles after searching; matching is on file names, so directory-only queries (`src/core`) return nothing by design.
