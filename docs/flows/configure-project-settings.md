# Flow: configure project settings

1. **Trigger** — with a project loaded, the user opens **Settings ▾**.
2. **Entry point** — `SettingsMenu` in `features/project_settings`.
3. **Editor sequence**
   1. Choose **Editor...** and enter an application name or full executable path.
   2. `EditorConfigModal` reads the latest `.codechart/config.json`.
   3. It replaces only `editor`, writes the complete config through
      `ProjectConfigClient`, and updates the editor held by `App`.
   4. Module **Open in editor** actions immediately use the new value.
4. **C++ sequence**
   1. When the graph contains a C++ module, choose **C++ include paths...**.
   2. The existing `UnrealConfigModal` edits include paths and Unreal toggles.
   3. Saving preserves `editor`, writes the config, and reloads project analysis.
5. **Reads/Writes** — `.codechart/config.json` through the Tauri project-config
   commands. `code` is used when the file or editor field is missing.
6. **Files** — `features/project_settings/`, `features/project_config/`,
   `ipc/project-config-client/`, `app/Private/App.tsx`, and
   `src-tauri/src/unreal_config/`.
7. **Common failure modes** — C++ settings are intentionally absent for graphs
   without C++ modules; blank editor values cannot be saved; read/write errors
   remain visible in the active modal.
