# Project Search (Ctrl+Shift+F full-text find bar)

Full-text, case-insensitive substring search over the **detected modules'** sources with
match-by-match navigation. See `docs/flows/search-project.md` for the end-to-end sequence.

## Responsibilities

| Piece | File | Role |
|-------|------|------|
| `search::search_sources` | `src-tauri/src/search/mod.rs` | **Pure** (over the `ProjectSource` trait). Per-line lowercase `contains`; one `SearchMatch { path, line (1-based), lineText }` per matching file, using its first matching line, trimmed/clipped to 200 chars; stops at `MAX_MATCHES = 500` with `truncated: true`; unreadable files skipped. |
| `search_module_sources` | `src-tauri/src/tauri_api/mod.rs` | Command glue: `FsProjectSource` over the working tree. Returns `SearchResult` directly (no error mode). |
| `AnalysisClient.searchModuleSources` | `src/ipc/analysis-client` | IPC seam. `ProjectSearchMatch`/`ProjectSearchResult` are hand-mirrored TypeScript interfaces. The mock searches bundled fixture sources via `search-fixture-sources.ts` with matching semantics. |
| `GraphSessionStore.searchProjectSources` | `state/graph-session` | Thin entry point (the client is private to the store). Scope = full graph, or `filterTestModules` while **Hide tests** is on, so every result is navigable. **Stores nothing, emits nothing.** |
| `project_search` | `features/graph_canvas/Private/project_search/` | Nested deep module (public interface: `ProjectSearch`). `GraphCanvas` owns the bar's open state so the view-controls toolbar can open it; query/result/active-index state remains component-local so typing never re-renders the canvas. Debounce 300 ms, min 2 chars, stale-response sequence guard. Navigation reuses `store.focusOn` only (select, expand ancestors, center). Match stepping lives in the shared `Private/match-stepper.ts` (also used by find-in-frame). |
| `ProgrammaticMoveGuard` | `features/graph_canvas/Private/programmatic-move-guard.ts` | Shared by review-note and search navigation to preserve an already-open preview through the programmatic `focusOn` pan while user pans still dismiss it. Search itself never opens or raises a preview. |

## Invariants to preserve

- Search results are never persisted in a store: they die with the bar (close, Esc, `phase-changed`).
- The find bar must keep `data-preview-keep` on its root: `use-close-preview-frames` treats clicks inside it as "not outside", so using search does not dismiss an already-open preview.
- Backend match semantics and the mock (`search-fixture-sources.ts`) must stay in sync: one match per file at its first matching line, 1-based lines, trim + clip, cap + `truncated`.
- `search_module_sources` scans **only** the paths the frontend passes (the detected-modules contract); it must never walk the filesystem itself.
- Unshifted Ctrl/Cmd+F is claimed only by a focused/hovered preview frame (find-in-frame, `docs/flows/find-in-preview.md`); everywhere else it stays with the browser.
