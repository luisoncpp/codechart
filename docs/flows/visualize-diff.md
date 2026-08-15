# Visualize diff

End-to-end flow for overlaying a git or pasted diff on the architecture map.

## Trigger

User clicks **View ▾ → Visualize diff…** in the top toolbar (item hidden while a diff is active).

## Entry point

`DiffModal` (`features/diff_visualizer`) → `GraphSessionStore.applyDiffFromPaste` or `applyDiffFromCommits`.

## Sequence

1. **Paste mode** — user pastes unified diff text → `overlayFromPastedDiff` maps file paths to module ids on the loaded graph, including deleted files rendered as ghost cards with a red border (`#dc2626`).
2. **Git commits mode** (repo root must be a git checkout) — user picks **before** (left) and **after** (right) via searchable commit menus (last 100 commits). Each selected commit's snapshot label includes its date as `BEFORE (YYYY-MM-DD)` or `AFTER (YYYY-MM-DD)`. Selecting a commit for **after** with **before** empty auto-fills its parent.
3. **Local changes** is the first **after** option. Selecting it defaults **before** to the latest commit and shows an **Exclude submodules** checkbox (default on, session-only). `git diff <before>` supplies tracked staged/unstaged changes; when exclude is on, `--ignore-submodules=all` skips submodule gitlink noise and modules under gitlink paths (from `git ls-files -s` mode `160000`) are removed from the before/after graph compare so checked-out submodule files are not marked affected. Eligible untracked files are appended as full-add patches. Eligibility is the loaded graph's module paths intersected with `git ls-files --others --exclude-standard`, so ignored and unsupported files never enter the diff.
4. Commit-to-commit runs `git diff -M`, extracts the changed paths, then loads one combined graph/source snapshot per ref (passing the session's **Hide dot directories** flag so historical trees match the live graph). Local changes loads one combined snapshot for **before** and uses the loaded current graph as **after**. Git paths drive **module** highlights; graph comparison drives **edge** add/remove. Commit-to-commit runs `LayoutEngine.layout(before)` so deleted modules and L1.5 removed-symbol ghosts get historical coordinates; **local changes skip that extra layout** and place ghosts with greedy collision avoidance on the live canvas. **Renames** (git headers, then 1:1 fingerprint fallback on leftover deleted×added files) add yellow arrows from the ghost/deleted card to the created card; both cards keep their red/green borders.
5. Store sets `diffOverlay` and emits `diff-changed`.
6. `GraphCanvas` re-projects the reduced graph, then `applyDiffOverlay` stamps `data.diffState` on nodes/edges, sets `diffVisualizing` on group nodes, and injects ghost modules (placed via greedy collision avoidance in `placeGhostModules` to prevent stacking on top of each other or overlapping diff modules) + phantom removed/added edges + yellow rename arrows (`diffState: "renamed"`).
7. In **L1.5**, commit and local-change comparisons read changed modules from both snapshots and intersect changed lines with exported-symbol declaration/implementation ranges. Added symbols render **green/solid**, retained symbols whose declaration or implementation changed render **yellow/dotted**, and commit-to-commit restores removed symbols from the before layout as **red/dashed** ghost boxes (local changes have no before layout, so those removed-symbol ghosts are omitted).
8. `edge-style` / `EdgeLayer` render added edges **green** (`#16a34a`), removed edges **red** (`#dc2626`) with an **X** head instead of an arrow, and rename edges **yellow** (`#d97706`, arrow head) from the deleted module to the created one. All diff edges render thicker (`2.8px`) than normal focused edges (`2.0px`) and sit in the edge layer behind module cards. When no module is selected, all diff edges stay fully opaque (`1.0`); when a module is selected, diff edges not connected to that module dim to `0.45` opacity like other context edges while connected diff edges stay fully opaque.
9. Unchanged modules render at **~40% opacity**; affected/deleted keep full opacity + colored borders. Group titles and descriptions dim to the same level.
10. **L0 is disabled** while diff is active — scroll zoom floors at **L1** so module diff highlights stay visible; normal L0 returns when diff is cleared.
11. **L2 code blocks** and the **symbol source widget** (preview frames) show `+` green / `-` red diff rows when line diff data exists for that file. Renamed files compute and render their line diff against the original pre-rename file instead of marking every line as added. Line highlights index the **after-snapshot** coordinates, so while a diff is active the store overrides `sourceCache` (per diffed path) with the overlay's `afterSourceByPath` — the panels render that exact snapshot, not the live file, which may have drifted since the diff was computed. `clearDiffOverlay` drops the overrides so the live file is re-read.
12. **Stop visualizing diff** (`DiffOverlayBar`) → `store.clearDiffOverlay()`.
13. **Review tracking** — while active, diffed files can be checkmarked as reviewed (card checkbox or the bar's `Reviewed X/Y` checklist); marks persist per project+diff id and restore when the same diff is re-applied. See [mark-file-reviewed](./mark-file-reviewed.md).
14. **Deleted module inspection & rename navigation** — selecting a deleted module (ghost card) opens its inspection details (`ModuleInspection`), showing its path, metadata, deleted status, and whether it was renamed. If renamed, a clickable button links to the target module ("Renamed to"), and inspecting the destination module similarly links back to the source module ("Renamed from"), centering the viewport on that module via `store.focusOn(moduleId)`.

## Reads

- Current session `ProjectGraph` + `LayoutedGraph` (display base)
- Git tree at two refs (`git ls-tree` + `git cat-file --batch`, via `MemoryProjectSource`), each reused for graph analysis and changed module bodies
- Working tree tracked diff + Git's ignored-aware untracked list
- Pasted unified diff text (path headers + import additions/removals for diff edges)

## Writes

- `GraphSessionStore.diffOverlay` (session-only; cleared on project reload)
- `GraphSessionStore.sourceCache` — diffed paths overridden with the after-snapshot while the overlay is active; restored on clear

## Side effects

- Git commit mode runs two full analyses + one layout of the before graph when anything was deleted. Local changes load one snapshot and never re-layout the before graph. Each historical tree is loaded once, and Git child processes are created without console windows on Windows.

## Files to inspect

| Piece | File |
|-------|------|
| Path parse + graph compare | `domain/diff` |
| Rename matching | `domain/diff/Private/attach-renames.ts` |
| Overlay on RF models | `domain/diff/Private/apply-diff-overlay.ts` |
| Session API | `state/graph-session/Private/graph-session-store.ts` |
| Modal + stop bar | `features/diff_visualizer` |
| Edge/module styling | `edge-style.ts`, `EdgeBucketSvg.tsx`, `ModuleNodeView.tsx`, `GroupNodeView.tsx` |
| Git IPC | `src-tauri/src/git`, `ipc/git-client` |

## Common failure modes

- **Git commits disabled** — folder is not a git repo (`git_is_repo` false).
- **Analyze at ref fails** — invalid ref or git not on PATH.
- **Pasted diff, deleted file** — deleted files are rendered as ghost module cards with red borders, matching git commit mode.
- **Rename vs copy** — `copy from`/`copy to` is an add only (no yellow arrow, original stays). Untracked working-tree adds are paired by fingerprint fallback because `git diff -M` never sees them.
- **Pasted diff, symbol states** — exact added/removed/modified symbol classification requires before/after snapshots, so paste mode remains module- and line-level only.
