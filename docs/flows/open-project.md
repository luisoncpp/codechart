# Flow — Open a project (UI or CLI → live graph)

The user-facing front of [analyze-project](./analyze-project.md): picking a folder
in the running app or launching with a CLI path until the canvas renders.

## Triggers

1. **UI** — user clicks **Open folder…** in the top bar (`ProjectLoaderPanel.open()`).
2. **CLI** — desktop app launched with a project path:
   - `codechart C:\repos\my-app`
   - `codechart --project C:\repos\my-app`
   - `codechart --project=C:\repos\my-app`
   - Dev: `npm run tauri dev -- C:\path` or `npm run tauri dev -- --project C:\path`
   - `--project` wins when both a flag and a positional path are present.

## Step-by-step

| # | Step | Function | File |
|---|------|----------|------|
| 0 | (CLI only) Parse argv on Tauri setup; expose path to frontend | `parse_startup_project_path`, `get_startup_project_path` | `src-tauri/src/startup_args/mod.rs`, `src-tauri/src/tauri_api/mod.rs` |
| 0b | (CLI only) On mount, fetch startup path and load it | `useOpenStartupProject` | `app/Private/use-open-startup-project.ts`, `ipc/startup-client` |
| 1 | Native directory dialog → absolute path (or null on cancel) | `pickFolder` | `project_loader/Private/pick-folder.ts` |
| 2 | Remember path; kick off load | `session.loadProject(path)` | `state/graph-session/Private/graph-session-store.ts` |
| 3 | IPC `analyze_project { path, metricsWindowDays, hideTopLevelDotDirs }` → Rust (90 days + hide dot dirs by default) | `createTauriAnalysisClient` | `ipc/analysis-client/Private/tauri-analysis-client.ts` |
| 4 | Backend pipeline → `ProjectGraph` | `tauri_api::analyze_project` | `src-tauri/src/tauri_api/mod.rs` (→ [analyze-project](./analyze-project.md)) |
| 5 | 0 modules → `empty`; else ELK layout → `ready` | `GraphSessionStore.loadProject` | same as #2 |
| 6 | Render canvas + collapsible inspection panel (left-edge drag to resize) | `App` gates on `phase==="ready"` | `app/Private/App.tsx` |
| 6b | When ready, show collapsible **facade bypasses** list (textarea + **Copy list**) | `FacadeBypassList` | `project_loader/Private/FacadeBypassList.tsx` |
| 6c | Toolbar shows the project chip (folder basename, full path in tooltip) plus **View ▾**, **Search ▾**, and **Settings ▾** (`App` fills the `menus` slot when ready) | `ProjectLoaderPanel` + app menus | `project_loader/Private/ProjectLoaderPanel.tsx`, `app/Private/App.tsx` |
| 6d | Load the project's editor preference from `.codechart/config.json`; missing or old config defaults to `code` | `App` + `ProjectConfigClient` | `app/Private/App.tsx`, `ipc/project-config-client` |

## Session phases
`idle` → `loading` → (`ready` | `empty` | `failed`). The panel shows a hint per
phase; the ↻ **Reload** icon button re-runs `session.getProjectRoot()` (the panel keeps no local path state). Builder `Err` → `failed` with the
`BuildError` message (now `Display`-formatted).

## Reads / Writes / Side effects
- Reads: chosen folder via the backend `FsProjectSource`. Native file dialog or CLI argv.
- Writes: none on disk. Only in-memory session state.

## Notes
- The command uses its `path` argument as **both** the filesystem root and the
  graph's recorded `root` — see [lessons-learned](../lessons-learned/analyze-command-root-equals-path.md).
- Tests inject `pickFolder` into `ProjectLoaderPanel`, a `MockAnalysisClient`
  into the store, and `createMockStartupClient` for CLI startup — all under jsdom with no Tauri runtime.

## Common failure modes
- **Nothing happens on click** → dialog cancelled (returns null) or `dialog`
  capability missing from `src-tauri/capabilities/default.json`.
- **`failed` immediately** → IPC error (command not registered in `lib.rs`), a
  builder invariant broke, or an invalid CLI path; the message is shown in the bar.

Review Notes reconcile after a ready graph load. Their source UI stays disabled until that operation succeeds; a note-load error is retryable and does not hide the graph.
