# Review Stack & MR Review MCP

**Status: implemented.** Enables any coding assistant (Claude Code, Antigravity, Cursor, Codex) to drive CodeChart as an interactive **Change Stack** MR review cockpit over a production stdio MCP server (`tools/codechart-mcp`).

## Boundaries & Components

| Piece | Location | Responsibility |
|---|---|---|
| Persisted Review Stacks | `src-tauri/src/review_stacks` | Versioned v1 JSON in `.codechart/review-stacks.json`, keyed by `diffId` (cohorts, merge blockers, severity-tagged findings, agent Diff Notes), relative POSIX path + line-range validation, same-directory atomic writes. New fields are serde-defaulted, so older files still load |
| Diff Impact Engine | `src-tauri/src/diff_impact` | Pure graph analysis over `ProjectGraph`: foundation-first topological layering (`compute_topo_layers`), reverse-BFS transitive blast radius (`compute_blast_radius`), and newly introduced diagnostics (`compute_delta_diagnostics`) |
| Loopback MCP Bridge | `src-tauri/src/mcp_bridge` | Ephemeral `127.0.0.1:0` HTTP/1.1 bridge with 256-bit per-instance bearer token, `~/.codechart/instances.json` registry (`CODECHART_MCP_REGISTRY` override), and Tauri event relay (`mcp-bridge-request` → `mcp_bridge_respond`) |
| IPC & State | `src/ipc/review-stack-client`, `src/state/review-stack` | Typed Tauri/memory client + event-emitting `ReviewStackStore` (auto-syncs with `GraphSessionStore.getActiveDiffId()`, owns cohort spotlight, blast radius depths, severity filter, and one-shot navigation / explanation requests in `stack-requests.ts`); record mutations are pure functions in `stack-mutations.ts` |
| Canvas Projection | `src/domain/projection/Private/diff_overlay/apply-review-stack.ts` | Display-only `withReviewStackOverlay` post-pass after `withDiffReview`: stamps `spotlightState` (`active` / `dimmed`) and `blastDepth` (`SRC` / `R+N` badges) on module nodes |
| Review Stack UI | `src/features/review_stack` | Collapsible left `ReviewStackDrawer`, resizable from its right edge (`DrawerResizeHandle`, 240–720 px; session-only width kept while collapsed). Overview, Merge Blockers, Cohort stepper with `DEPENDS ON`, reviewed progress, per-hunk file list and **Read explanation ↗**, Findings severity filter, Impact/Blast Radius tab. `StackMarkdown` renders the summary and rationale. `InlineFindings` cards render in `DiffRowItem` |
| Frontend RPC Handler | `src/app/Private/mcp-bridge-handler.ts` (+ `mcp-bridge-review.ts` for stack authoring/state), `use-mcp-bridge.ts` | Listens for `mcp-bridge-request` and dispatches all 14 RPC methods against `GraphSessionStore`, `ReviewNotesStore`, and `ReviewStackStore` |
| Stdio MCP Server | `tools/codechart-mcp` | Node 24 native-TS (`erasableSyntaxOnly`) stdio MCP server (`npm run mcp`) exposing 15 tools (including `export_review_comments` for Markdown/GitHub/GitLab and headless `codechart-cli` fallback for `get_architecture_summary` / `analyze_diff_impact` / `export_review_comments`) and 2 resources (`codechart://session/active`, `codechart://review/notes`) |

## Key Invariants

- **Pure `ProjectGraph`:** Review Stacks, findings, spotlight, and blast radius never mutate `ProjectGraph` or `GraphDiffOverlay`.
- **Per-`diffId` persistence:** Stacks and findings survive app restarts via `.codechart/review-stacks.json` and are wiped alongside Review Notes and Diff Reviews by Settings **Clear review info**.
- **Loopback-only authenticated bridge:** Only `127.0.0.1` is bound, and `/rpc` requires `Authorization: Bearer <token>` from `~/.codechart/instances.json`.
- **Clean separation from `playtest-mcp`:** `playtest-mcp` remains a dev-only WebView2 CDP harness; `codechart-mcp` runs in production builds via the typed Rust/Tauri bridge.

## Cohorts, Explanations & Agent Diff Notes

- **Cohorts are change groups, not file groups.** `ReviewCohort.hunks[]` (`path`, `side`, `startLine`, `endLine`) lets one file be split across cohorts; `moduleIds` remains for whole-file members and old files. Cohort files = `moduleIds ∪ hunks[].path` (`cohortModuleIds`; module id == repo-relative path). They drive the spotlight and the drawer progress. Diff Review checkmarks are per file, so a split file counts in each of its cohorts.
- **Code bands:** `activeCohortRangesFor(path)` → `DiffCodeLines` → `DiffRowItem` computes a row-local `inCohort` boolean (side-aware) → `DiffCodeLine` paints an inset violet left band + `__line--cohort`. Only the boolean reaches the memoized row.
- **Explanation frame:** `ReviewCohort.explanation` (markdown). `requestExplanation(cohortId)` (drawer button, or `focus_layer` unless `openExplanation: false`) → one-shot request → `useReviewStackNavigation` consumes it → `usePreviewFrames().openMarkdownFrame` opens a **pinned** markdown preview frame (`moduleId: review-stack:<id>`, virtual root-level `modulePath` so `[[links]]` resolve from the root; reopening dedups and refreshes). It is pinned because an unpinned frame closes on the first canvas move.
- **Agent Diff Notes:** `upsert_diff_notes` → `ReviewStackRecord.diffNotes` (upsert by `id`, persisted per `diffId`, survives `set_review_stack`, cleared with the stack). `DiffCodeLines` appends `diffNotesFor(path)` to the overlay's pasted Diff Notes, so both render through `DiffNoteNotice`. They are explanations, not MR comments, so `export_review_comments` does not export them.
- **Drawer → code navigation:** file/hunk entries go through `requestNavigate` → `useReviewStackNavigation` → `createReviewNotePreview`, which arms the open grace before its first `await` so the opening click cannot close the frame (lesson `microtasks-run-between-click-listeners`). The explanation frame opens top-right, code frames top-left.
- **Drawer markdown** (`StackMarkdown`): private `Marked` instance; raw HTML escaped; scheme-less links render as their label (never a relative `href`); links with a scheme open in a new tab.

## Impact Rules

- **Before-graph retention:** `GraphSessionStore.getDiffGraphs()` keeps the `{ before, after }` graphs the overlay was built from (commits: both ref snapshots; working tree: base snapshot + live graph, submodules excluded). Cleared with the overlay. `analyze_diff_impact` and the drawer's refresh both go through `src/app/Private/request-diff-impact.ts`, which passes them as `before`/`after`, so `newDiagnostics` is real. Paste diffs have no before-graph → `diffGraphs = null` and the report carries `newDiagnosticsAvailable: false` (Impact tab says "Not computed"); never read `[]` as clean there.
- **Topological layering (`topo_layers.rs` + `layer_depth.rs`):** deps between changed modules skip `references::is_paired_rust_parent_child` edges (same exemption as `flag_cycles`; `mod child;` + `use super::` would make every Rust crate one cycle). Remaining cycles are Tarjan SCCs (`references::find_cycle_sccs`) condensed to one node; each node is layered at its longest-path depth. A cycle is never split, layer K depends only on layers < K, and `TopoLayer.cyclic` marks layers holding a multi-module SCC. Output sorted/deterministic.
- **GitLab export SHAs (`tools/codechart-mcp/Private/diff-shas.ts`):** every `position` needs `base_sha`/`start_sha`/`head_sha`. Caller args `baseSha`/`startSha`/`headSha` win; otherwise git resolves them from the `diffId` against `projectRoot` (live `get_active_context`, arg, or `CODECHART_PROJECT_ROOT`): `commits:B..H` → start=`B`, head=`H`, base=`merge-base B H`; `working-tree:B` → all three = `B` + top-level `warning` (GitLab can't comment on uncommitted code). Paste/unresolvable → positions without SHAs + `missingShas: true` + `warning`. Multi-line ranges anchor at `endLine` with "_(lines a–b)_" in the body (`line_range` needs per-line `line_code`s we can't derive). `formatGitLab` stays pure; SHAs arrive via `ExportInput.diffShas`.

## Assistant MCP Registration

```json
{
  "mcpServers": {
    "codechart": {
      "command": "node",
      "args": ["C:/Proyectos/codechart/tools/codechart-mcp/index.ts"]
    }
  }
}
```

## Flow

See [review-mr-via-mcp](../flows/review-mr-via-mcp.md).
