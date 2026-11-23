# Review MR via MCP

End-to-end flow for an AI coding assistant structuring and guiding an MR review inside a live CodeChart desktop window.

## Trigger

User asks their coding assistant (connected to the CodeChart MCP server, `codechart --mcp`) to load and review an MR, branch diff, or working-tree diff in CodeChart.

## Entry point

`src-tauri/src/main.rs` (`--mcp`) → `mcp_server::run_stdio_process` (JSON-RPC lines on stdin/stdout) → `protocol::Server` → `schema::normalize` (tool-schema defaults) → `BridgeClient` (`POST http://127.0.0.1:<port>/rpc`) → `src-tauri/src/mcp_bridge` → `mcp-bridge-request` event → `McpBridgeHandler` (`src/app/Private/mcp-bridge-handler.ts`).

## Sequence

1. **Discover instance:** `BridgeClient` reads `~/.codechart/instances.json`, checks `GET /health` on the newest entry, and sends authenticated `POST /rpc` requests.
2. **Open project (if needed):** `get_active_context` shows no instance, no `projectRoot`, or another folder → agent calls `open_project(path)` → live window: `open_project` RPC → `GraphSessionStore.loadProject`; no window: `launch_app` spawns `codechart --project <path>` → server polls `get_active_context` until `phase` is `ready` (see `tool_project.rs`).
3. **Load diff:** Agent calls `load_diff(mode, baseRef?, headRef?, diffText?)` → `GraphSessionStore` applies the diff overlay, keeps the `{ before, after }` graphs it was built from (`getDiffGraphs()`; null for paste), and sets `activeDiffId` → `ReviewStackStore.activateDiff` loads any persisted stack for that `diffId`.
4. **Compute impact:** Agent calls `analyze_diff_impact` → handler passes `getDiffGraphs()` as `before`/`after` → Rust `diff_impact::analyze_diff_impact` returns foundation-first `TopoLayer[]` (cycles = one `cyclic` layer), reverse-BFS `BlastRadiusEntry[]`, `affectedGroupIds`, and newly introduced `newDiagnostics`; the handler adds `newDiagnosticsAvailable` (false for paste diffs).
5. **Author Change Stack, Diff Notes & Findings:** Agent calls `set_review_stack(title, summary, cohorts, blockers)` (cohorts carry markdown `rationale` + `explanation` and line-range `hunks`; a file may be split across cohorts), `upsert_diff_notes(notes[])` (markdown explanations under specific lines) and `upsert_findings(findings[])` → all persisted to `.codechart/review-stacks.json` → `ReviewStackDrawer` opens on the left; Diff Notes and `InlineFindings` render in L2/Preview Frames.
6. **Guided review:** User clicks a cohort (or agent calls `focus_layer`) → `ReviewStackStore.focusCohort` spotlights the cohort's files and bands its hunks in code. `focus_layer` (or **Read explanation ↗**) → `requestExplanation` → `review-stack-canvas.ts` consumes it → pinned markdown preview frame with the cohort explanation. The user also inspects blast-radius `R+N` badges (`show_blast_radius`), opens Preview Frames (`navigate_to`), resolves findings, and adds human `Review Notes`.
7. **Two-way handoff & export:** Agent calls `get_active_context()` to see the user's current selection/cohort, `get_review_state()` to read human `Review Notes`, finding statuses, and `Diff Reviews` checkmarks, and `export_review_comments(format: "markdown" | "github" | "gitlab")` to produce ready-to-post MR review payloads (GitLab: SHAs from `baseSha`/`startSha`/`headSha` args or `git rev-parse`/`merge-base` on the `diffId` refs; else `missingShas: true`).
8. **Headless mode (optional):** When no CodeChart desktop window is open, passing `projectRoot` (or setting `CODECHART_PROJECT_ROOT`) lets `get_architecture_summary`, `analyze_diff_impact`, and `export_review_comments` run in-process (`mcp_server/headless.rs` → `cli::analyze_fs` / `cli::compute_impact`) and read `.codechart/` files on disk.

## Reads / Writes

- **Reads:** `~/.codechart/instances.json`, live `ProjectGraph`, `GraphDiffOverlay`, `.codechart/review-notes.json`, `.codechart/diff-reviews.json`.
- **Writes:** `.codechart/review-stacks.json` (atomic), `.codechart/diff-reviews.json` (via `set_files_reviewed`), in-memory spotlight/blast-radius/navigation state.

## Files to inspect

| Piece | File |
|---|---|
| MCP server & tools | `src-tauri/src/mcp_server/` (`protocol.rs`, `tool_*.rs`, `headless.rs`, `export.rs`) |
| Rust loopback bridge | `src-tauri/src/mcp_bridge/mod.rs` |
| Rust impact & persistence | `src-tauri/src/diff_impact/mod.rs`, `src-tauri/src/review_stacks/mod.rs` |
| Frontend RPC handler | `src/app/Private/mcp-bridge-handler.ts`, `src/app/Private/use-mcp-bridge.ts` |
| Store & UI | `src/state/review-stack/`, `src/features/review_stack/` |
