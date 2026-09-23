# Visualize diff

End-to-end flow for overlaying a git or pasted diff on the architecture map.

## Trigger

User clicks **View ▾ → Visualize diff…** in the top toolbar (item hidden while a diff is active).

## Entry point

`DiffModal` (`features/diff_visualizer`) → `GraphSessionStore.applyDiffFromPaste` or `applyDiffFromCommits`.

## Sequence

1. **Paste mode** — user pastes unified diff text → `overlayFromPastedDiff` maps file paths to module ids on the loaded graph, including deleted files rendered as ghost cards with a red border (`#dc2626`). Git extended headers (`diff --git`, `new file mode`) are **optional**: a **bare** unified diff (`diff -u`, most LLM-generated patches) carries only `---`/`+++` pairs, so a `--- ` header following this section's `+++ ` is the next file boundary. All four parsers over diff text (`parse-unified-diff`, `parse-line-diff`, `parse-diff-imports`, `parse-diff-notes`) share one header rule via `scanDiffLines` — a header is the `---`/`+++` **pair**, never a prefix, so a removed `-- comment` line stays content. Import edges take the after-path as their source; a deleted file (`+++ /dev/null`) falls back to its before-path.
2. **Git commits mode** (repo root must be a git checkout) — user picks **before** (left) and **after** (right) via searchable commit menus (last 100 commits). Each selected commit's snapshot label includes its date as `BEFORE (YYYY-MM-DD)` or `AFTER (YYYY-MM-DD)`. Selecting a commit for **after** with **before** empty auto-fills its parent.
3. **Local changes** is the first **after** option. Selecting it defaults **before** to the latest commit and shows an **Exclude submodules** checkbox (default on, session-only). `git diff <before>` supplies tracked staged/unstaged changes; when exclude is on, `--ignore-submodules=all` skips submodule gitlink noise and modules under gitlink paths (from `git ls-files -s` mode `160000`) are removed from the before/after graph compare so checked-out submodule files are not marked affected. Eligible untracked files are appended as full-add patches. Eligibility is the loaded graph's module paths intersected with `git ls-files --others --exclude-standard`, so ignored and unsupported files never enter the diff.
4. Commit-to-commit runs `git diff -M`, extracts the changed paths, then loads one combined graph/source snapshot per ref (passing the session's **Hide dot directories** flag so historical trees match the live graph). Local changes loads one combined snapshot for **before** and uses the loaded current graph as **after**. Git paths drive **module** highlights; graph comparison drives **edge** add/remove. Commit-to-commit runs `LayoutEngine.layout(before)` so deleted modules and L1.5 removed-symbol ghosts get historical coordinates; **local changes skip that extra layout** and place ghosts with greedy collision avoidance on the live canvas. **Renames** (git headers, then 1:1 fingerprint fallback on leftover deleted×added files) add yellow arrows from the ghost/deleted card to the created card; both cards keep their red/green borders.
5. Store sets `diffOverlay` and emits `diff-changed`.
6. `GraphCanvas` re-projects the reduced graph, then `applyDiffOverlay` stamps `data.diffState` on nodes/edges, sets `diffVisualizing` on group nodes, and injects ghost modules (placed via greedy collision avoidance in `placeGhostModules` to prevent stacking on top of each other or overlapping diff modules) + phantom removed/added edges + yellow rename arrows (`diffState: "renamed"`).
7. In **L1.5**, commit and local-change comparisons read changed modules from both snapshots and intersect changed lines with exported-symbol declaration/implementation ranges. Added symbols render **green/solid**, retained symbols whose declaration or implementation changed render **yellow/dotted**, and commit-to-commit restores removed symbols from the before layout as **red/dashed** ghost boxes (local changes have no before layout, so those removed-symbol ghosts are omitted).
8. `edge-style` / `EdgeLayer` render added edges **green** (`#16a34a`), removed edges **red** (`#dc2626`) with an **X** head instead of an arrow, and rename edges **yellow** (`#d97706`, arrow head) from the deleted module to the created one. All diff edges render thicker (`2.8px`) than normal focused edges (`2.0px`) and sit in the edge layer behind module cards. When no module is selected, all diff edges stay fully opaque (`1.0`); when a module is selected, diff edges not connected to that module dim to `0.45` opacity like other context edges while connected diff edges stay fully opaque.
9. Unchanged modules render at **~40% opacity**; affected/deleted keep full opacity + colored borders. Group titles and descriptions dim to the same level.
10. **L0 is disabled** while diff is active — scroll zoom floors at **L1** so module diff highlights stay visible; normal L0 returns when diff is cleared.
11. **L2 code blocks** and the **symbol source widget** (preview frames) show `+` green / `-` red diff rows when line diff data exists for that file. Renamed files compute and render their line diff against the original pre-rename file instead of marking every line as added. **Cross-file moved lines detection** (`detectMovedLines`) finds code relocated between different files (e.g. multi-part refactors): moved lines render **yellow** (`#fef9c3`, gutter `+` `#ca8a04`) in the destination file and **orange** (`#ffedd5`, gutter `-` `#ea580c`) in the source file, with hover tooltips indicating origins (`Moved from <path>:<line>`) and destinations (`Moved to <path>:<line>`). Line highlights index the **after-snapshot** coordinates, so while a diff is active the store overrides `sourceCache` (per diffed path) with the overlay's `afterSourceByPath` — the panels render that exact snapshot, not the live file, which may have drifted since the diff was computed. `clearDiffOverlay` drops the overrides so the live file is re-read. **Paste mode** has no snapshot and its header numbers need not match the file on disk (unpatched, or with unrelated local edits), so `anchorPasteDiff` locates **each hunk by content** — after side = already applied, before side = apply it; edge context may be fuzzed — renders the rebuilt text, and remaps added rows, removal anchors and after-side Diff Notes to where each hunk landed. A hunk found nowhere drops its rows rather than misplacing them. **Deleted files** (ghost cards and still-present paths marked deleted) open a preview frame via **Open file preview**; the body is empty after-text plus the overlay's removed rows (or a synthesized all-removed diff from `beforeSourceByPath`), so every line is red. **Open in editor** and **Reveal in file explorer** are disabled for those cards.
12. **Diff Notes** — read-only markdown explanations parsed from `#` column-0 marker lines in pasted unified diffs. In L2 code blocks and preview frames (`DiffCodeLines`), Diff Notes stack directly below the target diff row (and above any Review Notes on the same line). Unbound `#` markers are dropped and displayed in a floating warning panel with a copy button.
13. **Stop visualizing diff** (`DiffOverlayBar`) → `store.clearDiffOverlay()`.
14. **Review tracking** — while active, diffed files can be checkmarked as reviewed (card checkbox or the bar's `Reviewed X/Y` checklist); marks persist per project+diff id and restore when the same diff is re-applied. See [mark-file-reviewed](./mark-file-reviewed.md).
15. **Deleted module inspection & rename navigation** — selecting a deleted module (ghost card) opens its inspection details (`ModuleInspection`), showing its path, metadata, deleted status, and whether it was renamed. If renamed, a clickable button links to the target module ("Renamed to"), and inspecting the destination module similarly links back to the source module ("Renamed from"), centering the viewport on that module via `store.focusOn(moduleId)`.

## Reads

- Current session `ProjectGraph` + `LayoutedGraph` (display base)
- Git tree at two refs (`git ls-tree` + `git cat-file --batch`, via `MemoryProjectSource`), each reused for graph analysis and changed module bodies. **Every path is listed; only the blobs `analysis::opens_file` accepts are read** — source files, `*.group.md`, `*.meta`, `tsconfig`/`jsconfig`, `.codechart/config.json`. A repo's art, fonts and lock files are usually most of its bytes and none of its graph (79% of the bytes in this repo), and two snapshots load per commit-to-commit diff. A skipped path reads back as `NotFound`, never as empty content.
- Working tree tracked diff + Git's ignored-aware untracked list
- Pasted unified diff text (path headers + import additions/removals for diff edges)

## Writes

- `GraphSessionStore.diffOverlay` (session-only; cleared on project reload)
- `GraphSessionStore.sourceCache` — diffed paths overridden with the after-snapshot while the overlay is active; restored on clear
- `GraphSessionStore.diffOverlay.beforeSourceByPath` — deleted-file bodies from the git snapshot or reconstructed unified-diff hunks

## Side effects

- Git commit mode runs two full analyses + one layout of the before graph when anything was deleted. Local changes load one snapshot and never re-layout the before graph. Each historical tree is loaded once, and Git child processes are created without console windows on Windows.
- The two snapshot loads run **concurrently**: `load_project_snapshot` is `#[tauri::command(async)]`, so the `Promise.all` in `build-diff-overlay.ts` actually overlaps them and the window keeps painting. A bare `#[tauri::command]` would queue them on the main thread — see [lesson](../lessons-learned/sync-tauri-commands-run-on-the-main-thread.md).

## Files to inspect

| Piece | File |
|-------|------|
| Path parse + graph compare | `domain/diff` |
| Shared `---`/`+++` header rule | `domain/diff/Private/scan-diff-lines.ts` |
| Deleted-file before bodies | `domain/diff/Private/attach-deleted-sources.ts` |
| Paste-mode hunk anchoring | `domain/diff/Private/anchor-paste-diff.ts` (+ `paste-hunks.ts`, `paste-after-sources.ts`) |
| Rename matching | `domain/diff/Private/attach-renames.ts` |
| Overlay on RF models | `domain/projection/Private/diff_overlay/apply-diff-overlay.ts` |
| Session API | `state/graph-session/Private/graph-session-store.ts` |
| Modal + stop bar | `features/diff_visualizer` |
| Edge/module styling | `edge-style.ts`, `EdgeBucketSvg.tsx`, `ModuleNodeView.tsx`, `GroupNodeView.tsx` |
| Git IPC | `src-tauri/src/git`, `ipc/git-client` |

## Common failure modes

- **Git commits disabled** — folder is not a git repo (`git_is_repo` false).
- **Analyze at ref fails** — invalid ref or git not on PATH.
- **Pasted diff, deleted file** — deleted files are rendered as ghost module cards with red borders, matching git commit mode. Right-click **Open file preview** shows the reconstructed body as all-red rows; editor/explorer actions stay disabled.
- **Rename vs copy** — `copy from`/`copy to` is an add only (no yellow arrow, original stays). Untracked working-tree adds are paired by fingerprint fallback because `git diff -M` never sees them.
- **Pasted diff, `+` rows on the wrong lines** — has regressed repeatedly. A `[diff] … do not match the rendered source` console warning means the guard caught misaligned coordinates (they render as context). Reproduce by adding the paste shape / live-file state to `tests/paste-diff-alignment.test.ts`, then fix the parser or `anchorPasteDiff`; never loosen the guard. See [lesson](../lessons-learned/diff-line-highlights-index-after-snapshot.md).
- **Pasted diff, only one file highlighted** — was a bare (no `diff --git`) diff collapsing into one pending file section; fixed, see [lesson](../lessons-learned/four-parsers-read-the-same-diff-text.md). If it recurs, check the *parsers* (`parse-unified-diff.ts`, `parse-diff-imports.ts`) before suspecting path→module mapping.
- **Pasted diff, symbol states** — exact added/removed/modified symbol classification requires before/after snapshots, so paste mode remains module- and line-level only.
