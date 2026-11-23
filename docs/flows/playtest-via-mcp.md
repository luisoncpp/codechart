# Flow — Playtest Codechart via MCP

Launching the live desktop app from a coding assistant, interacting with the canvas/UI, capturing PNG screenshots, and shutting down cleanly.

## Trigger

Assistant calls `launch_app` (or `connect_app` for an already-open debug instance) on the `codechart-playtest` MCP server (`npm run playtest:mcp`).

## Step-by-step

| # | Step | Component |
|---|------|-----------|
| 1 | Probe `:1420`; reuse existing Vite or spawn `npm run dev` | `ProcessLauncher.ensureVite` |
| 2 | Allocate free localhost CDP port + temp `WEBVIEW2_USER_DATA_FOLDER`; spawn `cargo run --bin codechart` with `CODECHART_STARTUP_PROJECT` and `CODECHART_WINDOW_SIZE` | `ProcessLauncher.launch` + `src-tauri/src/lib.rs` |
| 3 | Poll `http://127.0.0.1:<port>/json/list` until the Codechart page target appears; connect WebSocket and enable `Runtime`, `Log`, `Page` | `CdpClient.connect` |
| 4 | Await `window.__codechartPlaytest` and (when `projectPath` given) `waitForReady()` so analysis, ELK layout, and initial `FitView` settle | `PlaytestSession.launch` → `PlaytestBridge.waitForReady` |
| 5 | Inspect state/rects (`get_state`, `codechart_action(list_nodes)`, `query_dom`), drive real inputs (`click`, `drag`, `wheel`, `type_text`, `press_key`) or helpers (`codechart_action`), and capture PNGs (`screenshot`) | `register-tools.ts`, `register-interaction-tools.ts` |
| 6 | Close CDP socket, kill spawned Tauri tree (and Vite only if launched by MCP), and remove temp WebView2 profile | `PlaytestSession.close` |

## Reads / Writes / Side effects

- Reads: Target codebase analyzed by the real Rust backend + live WebView2 DOM.
- Writes: Temporary WebView2 user-data folder in OS temp dir (deleted on `close_app` / process exit); optional screenshot PNG to `savePath`.
- Side effects: Opens a native Codechart desktop window sized to `width × height` (default `1440×900`).

## Common failure modes

- **Vite port 1420 unreachable or Cargo build error** → `launch_app` fails fast with captured stdout/stderr tail.
- **No CDP target found** → Another process blocked `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` or an existing instance reused a shared profile; `launch_app` prevents this by isolating `WEBVIEW2_USER_DATA_FOLDER`.
- **Element click fails ("zero size" / not found)** → Verify node/selector visibility via `query_dom` or `codechart_action(list_nodes)` (canvas nodes at L0 hide modules).
