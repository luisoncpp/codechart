# Visualize diff

End-to-end flow for overlaying a git or pasted diff on the architecture map.

## Trigger

User clicks **View ▾ → Visualize diff…** in the top toolbar (item hidden while a diff is active).

## Entry point

`DiffModal` (`features/diff_visualizer`) → `GraphSessionStore.applyDiffFromPaste` or `applyDiffFromCommits`.

## Sequence

1. **Paste mode** — user pastes unified diff text → `overlayFromPastedDiff` maps file paths to module ids on the loaded graph (module borders only; no edge overlay).
2. **Git commits mode** (repo root must be a git checkout) — user picks **before** (left) and **after** (right) via searchable commit menus (last 100 commits). Each selected commit's snapshot label includes its date as `BEFORE (YYYY-MM-DD)` or `AFTER (YYYY-MM-DD)`. Selecting a commit for **after** with **before** empty auto-fills its parent.
3. **Local changes** is the first **after** option. Selecting it defaults **before** to the latest commit. `git diff <before>` supplies tracked staged/unstaged changes; eligible untracked files are appended as full-add patches. Eligibility is the loaded graph's module paths intersected with `git ls-files --others --exclude-standard`, so ignored and unsupported files never enter the diff.
4. Commit-to-commit runs `git diff`, extracts the changed paths, then loads one combined graph/source snapshot per ref (passing the session's **Hide dot directories** flag so historical trees match the live graph). Local changes loads one combined snapshot for **before** and uses the loaded current graph as **after**. Git paths drive **module** highlights; graph comparison drives **edge** add/remove; `LayoutEngine.layout(before)` supplies ghost positions for deleted modules.
5. Store sets `diffOverlay` and emits `diff-changed`.
6. `GraphCanvas` re-projects the reduced graph, then `applyDiffOverlay` stamps `data.diffState` on nodes/edges, sets `diffVisualizing` on group nodes, and injects ghost modules + phantom removed edges.
7. In **L1.5**, commit and local-change comparisons read changed modules from both snapshots and intersect changed lines with exported-symbol declaration/implementation ranges. Added symbols render **green/solid**, removed symbols are restored from the before layout as **red/dashed** ghost boxes, and retained symbols whose declaration or implementation changed render **yellow/dotted**.
8. `edge-style` / `EdgeLayer` render added edges **green** (full opacity) and removed edges **red** with an **X** head instead of an arrow.
9. Unchanged modules render at **~40% opacity**; affected/deleted keep full opacity + colored borders. Group titles and descriptions dim to the same level.
10. **L0 is disabled** while diff is active — scroll zoom floors at **L1** so module diff highlights stay visible; normal L0 returns when diff is cleared.
11. **L2 code blocks** and the **symbol source widget** show `+` green / `-` red diff rows when line diff data exists for that file. Line highlights index the **after-snapshot** coordinates, so while a diff is active the store overrides `sourceCache` (per diffed path) with the overlay's `afterSourceByPath` — the panels render that exact snapshot, not the live file, which may have drifted since the diff was computed. `clearDiffOverlay` drops the overrides so the live file is re-read.
12. **Stop visualizing diff** (`DiffOverlayBar`) → `store.clearDiffOverlay()`.
13. **Review tracking** — while active, diffed files can be checkmarked as reviewed (card checkbox or the bar's `Reviewed X/Y` checklist); marks persist per project+diff id and restore when the same diff is re-applied. See [mark-file-reviewed](./mark-file-reviewed.md).

## Reads

- Current session `ProjectGraph` + `LayoutedGraph` (display base)
- Git tree at two refs (`git ls-tree` + `git cat-file --batch`, via `MemoryProjectSource`), each reused for graph analysis and changed module bodies
- Working tree tracked diff + Git's ignored-aware untracked list
- Pasted unified diff text (path headers only)

## Writes

- `GraphSessionStore.diffOverlay` (session-only; cleared on project reload)
- `GraphSessionStore.sourceCache` — diffed paths overridden with the after-snapshot while the overlay is active; restored on clear

## Side effects

- Git commit mode runs two full analyses + one layout. Each historical tree is loaded once, and Git child processes are created without console windows on Windows.

## Files to inspect

| Piece | File |
|-------|------|
| Path parse + graph compare | `domain/diff` |
| Overlay on RF models | `domain/diff/Private/apply-diff-overlay.ts` |
| Session API | `state/graph-session/Private/graph-session-store.ts` |
| Modal + stop bar | `features/diff_visualizer` |
| Edge/module styling | `edge-style.ts`, `EdgeBucketSvg.tsx`, `ModuleNodeView.tsx`, `GroupNodeView.tsx` |
| Git IPC | `src-tauri/src/git`, `ipc/git-client` |

## Common failure modes

- **Git commits disabled** — folder is not a git repo (`git_is_repo` false).
- **Analyze at ref fails** — invalid ref or git not on PATH.
- **Pasted diff, deleted file** — ghost module only appears in git commit mode (needs before-layout); paste mode highlights paths that still exist in the loaded graph.
- **Pasted diff, symbol states** — exact added/removed/modified symbol classification requires before/after snapshots, so paste mode remains module- and line-level only.
