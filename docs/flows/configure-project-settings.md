# Flow: configure project settings

1. **Trigger** — with a project loaded, the user opens **Settings ▾**.
2. **Entry point** — `SettingsMenu` in `features/project_settings`.
3. **Editor sequence**
   1. Choose **Editor...** and enter an application name or full executable path.
   2. `EditorConfigModal` reads the latest `.codechart/config.json`.
   3. It replaces only `editor`, writes the complete config through
      `ProjectConfigClient`, and updates the editor held by `App`.
   4. Module **Open in editor** actions immediately use the new value.
4. **Ignored directories sequence**
   1. Choose **Ignored directories...** (always available, unlike the C++ item).
   2. `IgnoredPathsModal` reads the latest `.codechart/config.json` and lists
      `ignoredPaths` in the shared `PathList` editor.
   3. Saving calls `writeIgnoredPaths`, which read-modify-writes only
      `ignoredPaths` (dropping blank rows), then reloads project analysis via
      `onIgnoredPathsSaved` — the graph changes, so a stale canvas would be wrong.
   4. Entries are exact repo-relative directory paths; see
      [unreal-config.md](../architecture/unreal-config.md).
5. **C++ sequence**
   1. When the graph contains a C++ module, choose **C++ include paths...**.
   2. The existing `UnrealConfigModal` edits include paths and Unreal toggles.
   3. Saving preserves `editor`, writes the config, and reloads project analysis.
6. **Clear review info sequence**
   1. Choose **Clear review info...** and confirm in the modal.
   2. `ReviewNotesStore.clearAll` wipes every note (immediate save, no Undo).
   3. `GraphSessionStore.clearAllDiffReviews` wipes every persisted diff
      review entry (all diffs) via the `clear_diff_reviews` command and
      unmarks the active diff.
7. **Reads/Writes** — `.codechart/config.json` through the Tauri project-config
   commands (`code` is used when the file or editor field is missing);
   `.codechart/review-notes.json` and `.codechart/diff-reviews.json` through
   their own commands.
8. **Files** — `features/project_settings/`, `features/project_config/`,
   `ipc/project-config-client/`, `state/review-notes/`,
   `state/graph-session/Private/diff-review-tracker.ts`,
   `app/Private/App.tsx`, `src-tauri/src/unreal_config/`, and
   `src-tauri/src/diff_reviews/`.
9. **Common failure modes** — C++ settings are intentionally absent for graphs
   without C++ modules; blank editor values cannot be saved; read/write errors
   remain visible in the active modal; a failed clear keeps the dialog open
   with the error (diff marks stay untouched).
