# Project Search (content, file, and exported-symbol find bar)

One find bar, three modes (`CanvasUiState.findBarMode`): **content** — full-text, case-insensitive
substring search over the **detected modules'** sources (Ctrl+Shift+F, `docs/flows/search-project.md`);
**files** — case-insensitive substring match over visible module file names (Ctrl+P,
`docs/flows/go-to-file.md`); and **symbols** — case-insensitive substring match over visible modules'
`exportedSymbols` (Search ▾ → Go to symbol, `docs/flows/go-to-symbol.md`). Files and symbols are
fully local with no IPC. All modes feed the same `BarResult { paths }` and share counter + `focusOn`
navigation; each matching module is one result, including a facade that re-exports a symbol.

## Responsibilities

| Piece | File | Role |
|-------|------|------|
| `search::search_sources` | `src-tauri/src/search/mod.rs` | **Pure** (over the `ProjectSource` trait). Per-line lowercase `contains`; one `SearchMatch { path, line (1-based), lineText }` per matching file, using its first matching line, trimmed/clipped to 200 chars; stops at `MAX_MATCHES = 500` with `truncated: true`; unreadable files skipped. |
| `backend_shell` facade | `src-tauri/src/lib.rs` | Re-exports `search_sources` and `SearchResult`; callers outside the backend shell access search only through this public boundary. |
| `search_module_sources` | `src-tauri/src/tauri_api/mod.rs` | Command glue: `FsProjectSource` over the working tree, then the `backend_shell` search export. Returns `SearchResult` directly (no error mode). |
| `AnalysisClient.searchModuleSources` | `src/ipc/analysis-client` | IPC seam. `ProjectSearchMatch`/`ProjectSearchResult` are hand-mirrored TypeScript interfaces. The mock searches bundled fixture sources via `search-fixture-sources.ts` with matching semantics. |
| `GraphSessionStore.searchProjectSources` | `state/graph-session` | Thin entry point (the client is private to the store). Scope = full graph, or `filterTestModules` while **Hide tests** is on, so every result is navigable. **Stores nothing, emits nothing.** |
| `GraphSessionStore.searchModuleFiles` | `state/graph-session` | Go-to-file: pure, synchronous filter of the same visible scope by file **name** (last path segment) substring. No IPC, no cap. |
| `GraphSessionStore.searchExportedSymbols` | `state/graph-session` | Go-to-symbol: pure, synchronous filter of the same visible scope by any `exportedSymbols` entry. A module appears once even when multiple exported names match. No IPC, no cap. |
| `project_search` | `features/graph_canvas/Private/project_search/` | Nested deep module (public interface: `ProjectSearch`). The bar's open flag + mode live in `CanvasUiState` (`graph_canvas/Private/controller/canvas-ui-state.ts`, exported via the facade; `openFindBar(mode)`) so the toolbar **Search ▾** menu (`SearchMenu`) can open all three modes; query/result/active-index state remains component-local so typing never re-renders the canvas. Content mode: debounce 300 ms, min 2 chars, stale-response sequence guard (`use-debounced-search.ts`). Files and symbols modes: synchronous from the first character (`use-file-name-search.ts`, `use-symbol-search.ts`). Switching modes clears the query. Navigation reuses `store.focusOn` only (select, expand ancestors, center). Match stepping lives in the shared `Private/match-stepper.ts` (also used by find-in-frame). |
| `ProgrammaticMoveGuard` | `features/graph_canvas/Private/navigation/programmatic-move-guard.ts` | Shared by review-note and search navigation to preserve an already-open preview through the programmatic `focusOn` pan while user pans still dismiss it. Search itself never opens or raises a preview. |

## Invariants to preserve

- Search results are never persisted in a store: they die with the bar (close, Esc, `phase-changed`).
- Symbol results use the analyzed graph's `exportedSymbols`, so they include both local exports and
  re-exports in different modules without reading source files or resolving a second symbol index.
- The live **content** query is mirrored into `CanvasUiState` via the **non-emitting** `setFindQuery` (cleared on close/reset): preview frames read it once at open time to seed their in-frame find bar (`PreviewFrame.initialFindQuery`). Keep the setter non-emitting — typing must never re-render the canvas. Files-mode queries are never mirrored (a file name is not a content query).
- The find bar must keep `data-preview-keep` on its root: `use-close-preview-frames` treats clicks inside it as "not outside", so using search does not dismiss an already-open preview.
- Backend match semantics and the mock (`search-fixture-sources.ts`) must stay in sync: one match per file at its first matching line, 1-based lines, trim + clip, cap + `truncated`.
- `search_module_sources` scans **only** the paths the frontend passes (the detected-modules contract); it must never walk the filesystem itself.
- Unshifted Ctrl/Cmd+F is claimed only by a focused/hovered preview frame (find-in-frame, `docs/flows/find-in-preview.md`); everywhere else it stays with the browser.
