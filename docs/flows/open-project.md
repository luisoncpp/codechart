# Flow — Open a project (UI → live graph)

The user-facing front of [analyze-project](./analyze-project.md): picking a folder
in the running app until the canvas renders.

1. **Trigger** — user clicks **Open folder…** in the top bar.
2. **Entry point** — `ProjectLoaderPanel.open()` (`src/features/project_loader/Private/ProjectLoaderPanel.tsx`).

## Step-by-step

| # | Step | Function | File |
|---|------|----------|------|
| 1 | Native directory dialog → absolute path (or null on cancel) | `pickFolder` | `project_loader/Private/pick-folder.ts` |
| 2 | Remember path; kick off load | `session.loadProject(path)` | `state/graph-session/Private/graph-session-store.ts` |
| 3 | IPC `analyze_project { path }` → Rust | `createTauriAnalysisClient` | `ipc/analysis-client/Private/tauri-analysis-client.ts` |
| 4 | Backend pipeline → `ProjectGraph` | `tauri_api::analyze_project` | `src-tauri/src/tauri_api/mod.rs` (→ [analyze-project](./analyze-project.md)) |
| 5 | 0 modules → `empty`; else ELK layout → `ready` | `GraphSessionStore.loadProject` | same as #2 |
| 6 | Render canvas + inspection panel | `App` gates on `phase==="ready"` | `app/Private/App.tsx` |
| 6b | When ready, show collapsible **facade bypasses** list (textarea + **Copy list**) | `FacadeBypassList` | `project_loader/Private/FacadeBypassList.tsx` |

## Session phases
`idle` → `loading` → (`ready` | `empty` | `failed`). The panel shows a hint per
phase; **Reload** re-runs the last picked path. Builder `Err` → `failed` with the
`BuildError` message (now `Display`-formatted).

## Reads / Writes / Side effects
- Reads: chosen folder via the backend `FsProjectSource`. Native file dialog.
- Writes: none on disk. Only in-memory session state.

## Notes
- The command uses its `path` argument as **both** the filesystem root and the
  graph's recorded `root` — see [lessons-learned](../lessons-learned/analyze-command-root-equals-path.md).
- Tests inject `pickFolder` into `ProjectLoaderPanel` and a `MockAnalysisClient`
  into the store, so the whole flow runs under jsdom with no Tauri runtime.

## Common failure modes
- **Nothing happens on click** → dialog cancelled (returns null) or `dialog`
  capability missing from `src-tauri/capabilities/default.json`.
- **`failed` immediately** → IPC error (command not registered in `lib.rs`) or a
  builder invariant broke; the message is shown in the bar.
