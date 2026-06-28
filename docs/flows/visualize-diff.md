# Visualize diff

End-to-end flow for overlaying a git or pasted diff on the architecture map.

## Trigger

User clicks **Visualize diff…** on the canvas (top-right, when no diff is active).

## Entry point

`DiffModal` (`features/diff_visualizer`) → `GraphSessionStore.applyDiffFromPaste` or `applyDiffFromCommits`.

## Sequence

1. **Paste mode** — user pastes unified diff text → `overlayFromPastedDiff` maps file paths to module ids on the loaded graph (module borders only; no edge overlay).
2. **Git commits mode** (repo root must be a git checkout) — user picks base + head → parallel `git diff` + two `analyzeProjectAtRef` snapshots → git paths drive **module** highlights; graph comparison drives **edge** add/remove → `LayoutEngine.layout(before)` supplies ghost positions for deleted modules.
3. Store sets `diffOverlay` and emits `diff-changed`.
4. `GraphCanvas` re-projects the reduced graph, then `applyDiffOverlay` stamps `data.diffState` on nodes/edges and injects ghost modules + phantom removed edges.
5. `edge-style` / `EdgeLayer` render added edges **green** (full opacity) and removed edges **red** with an **X** head instead of an arrow.
6. Unchanged modules render at **~40% opacity**; affected/deleted keep full opacity + colored borders.
7. **L2 code blocks** and the **symbol source widget** show `+` green / `-` red diff rows when line diff data exists for that file.
8. **Stop visualizing diff** (`DiffOverlayBar`) → `store.clearDiffOverlay()`.

## Reads

- Current session `ProjectGraph` + `LayoutedGraph` (display base)
- Git tree at two refs (`git ls-tree` + `git cat-file --batch`, via `MemoryProjectSource`)
- Pasted unified diff text (path headers only)

## Writes

- `GraphSessionStore.diffOverlay` (session-only; cleared on project reload)

## Side effects

- Git commit mode runs two full analyses + one layout (can be slow on large repos)

## Files to inspect

| Piece | File |
|-------|------|
| Path parse + graph compare | `domain/diff` |
| Overlay on RF models | `domain/diff/Private/apply-diff-overlay.ts` |
| Session API | `state/graph-session/Private/graph-session-store.ts` |
| Modal + stop bar | `features/diff_visualizer` |
| Edge/module styling | `edge-style.ts`, `EdgeBucketSvg.tsx`, `ModuleNodeView.tsx` |
| Git IPC | `src-tauri/src/git`, `ipc/git-client` |

## Common failure modes

- **Git commits disabled** — folder is not a git repo (`git_is_repo` false).
- **Analyze at ref fails** — invalid ref or git not on PATH.
- **Pasted diff, deleted file** — ghost module only appears in git commit mode (needs before-layout); paste mode highlights paths that still exist in the loaded graph.
