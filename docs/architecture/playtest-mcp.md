# Playtest MCP (`tools/playtest-mcp`)

**Status: implemented.** Entry point: `tools/playtest-mcp/index.ts` (Node 24 native TS, `erasableSyntaxOnly: true`, zero build step).

Allows coding assistants to launch, drive, inspect, and screenshot the **real Tauri 2 desktop app** over Windows WebView2 CDP without Playwright or Chromium downloads.

## Boundaries & Components

| Piece | File(s) | Responsibility |
|-------|---------|----------------|
| MCP Server | `tools/playtest-mcp/index.ts`, `Private/register-*.ts` | Exposes 14 stdio MCP tools (`launch_app`, `connect_app`, `close_app`, `screenshot`, `get_state`, `query_dom`, `get_console_logs`, `click`, `drag`, `wheel`, `type_text`, `press_key`, `codechart_action`, `eval_js`) |
| Process Launcher | `tools/playtest-mcp/Private/process-launcher.ts` | Reuses Vite on `:1420` (or spawns it), isolates `WEBVIEW2_USER_DATA_FOLDER` in `tmpdir()`, spawns `cargo run --bin codechart` with `--remote-debugging-port`, and tears down process trees cleanly (`taskkill /T /F` on Windows) |
| CDP Driver | `tools/playtest-mcp/Private/cdp-client.ts`, `cdp-dom.ts`, `cdp-pointer.ts`, `cdp-keyboard.ts`, `cdp-screenshot.ts` | Built on Node 24 `fetch` + `WebSocket`; buffers console/exceptions, resolves DOM targets, dispatches real mouse/wheel/key events, and captures viewport/selector PNGs |
| Tauri Startup / Window | `src-tauri/src/startup_args/mod.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/tauri_api/mod.rs` | `CODECHART_STARTUP_PROJECT` env fallback (CLI wins), debug-only `CODECHART_WINDOW_SIZE` (`<w>x<h>`), and `set_window_size` IPC command |
| Dev Playtest Bridge | `src/app/Private/playtest-bridge.ts`, `use-playtest-bridge.ts`, `features/graph_canvas/Private/navigation/ViewportBridge.tsx` | Exposed as `window.__codechartPlaytest` only when `import.meta.env.DEV` is true (tree-shaken out of release builds); bypasses OS file dialogs, waits for layout/FitView readiness, inspects store + viewport + node rects, and drives semantic zoom / diff paste |

## Key Invariants

- **Isolated WebView2 profile:** Each `launch_app` uses a fresh `WEBVIEW2_USER_DATA_FOLDER`, so playtest instances never collide with or terminate a user's open Codechart window.
- **No external browser binaries:** Uses Windows' WebView2 via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port>`.
- **Dev-only bridge:** `window.__codechartPlaytest` is guarded by `import.meta.env.DEV`; production builds contain no automation hook.
- **Canonical zoom synchronization:** `codechart_action(set_zoom_level)` moves the React Flow viewport to canonical level factors (`0.3`, `0.7`, `1.5`, `4.0`) centered on the canvas so real `onMove` / `onMoveEnd` zoom-level logic runs.

## Assistant MCP Registration

```json
{
  "mcpServers": {
    "codechart-playtest": {
      "command": "node",
      "args": ["C:/Proyectos/codechart/tools/playtest-mcp/index.ts"]
    }
  }
}
```

## Flow

See [playtest-via-mcp](../flows/playtest-via-mcp.md).
