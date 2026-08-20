# Diff Reviews

Diff Reviews track which files of an active diff overlay were already reviewed, persisted per project+diff in `.codechart/diff-reviews.json`. Like Review Notes, they live outside `ProjectGraph` and the diff overlay: the overlay stays a pure comparison result, while review progress is editable project data.

## Diff identity

Reviewed paths are keyed by a diff id derived when the overlay is applied (`state/graph-session/Private/diff-review-id.ts`):

- `commits:<baseRef>..<headRef>` — commit-to-commit
- `working-tree:<baseRef>` — local changes against a base ref
- `paste:<fnv1a-hex>` — pasted unified diff, content-addressed (hashing strips column-0 `#` marker lines so review marks survive adding or modifying Diff Notes)

Re-applying the same diff restores its marks. Marks are per path, not per content: a file that changes again under the same diff id (e.g. working-tree) stays marked.

## Responsibilities

- `src-tauri/src/diff_reviews` owns the v1 document (`{version, reviews: [{diffId, reviewedPaths}]}`), validation (same relative-POSIX-path rules as review notes), and same-directory atomic writes. Loading reconciles: persisted paths no longer in the diff are dropped and the result re-persisted; saving an empty set removes the entry. `clear_diff_reviews` wipes every entry (settings "clear review info").
- `ipc/diff-review-client` transports loads/saves/clears through Tauri or an in-memory client.
- `state/graph-session/Private/diff-review-tracker.ts` owns the active diff's reviewed set: loads reconciled state on apply, flips paths (or empties the set via `unmarkAll`) with serialized saves, clears on diff stop (persistence survives). The set is replaced immutably on every change so memoized canvas projections invalidate by identity. `clearAll` awaits any queued save (so it cannot resurrect an entry), wipes all persisted entries, and throws on failure.
- `GraphSessionStore` composes the tracker (optional 4th constructor client; a no-op default keeps tests/constructions unchanged): activates after each overlay build, clears on `clearDiffOverlay`/`loadProject`, emits the existing `diff-changed` on toggle/`unmarkAllDiffReviewed`/`clearAllDiffReviews`. Load/save failures surface as `getDiffReviewError()` without breaking the overlay.
- `domain/diff` `withDiffReview` is a display-only post-pass after `applyDiffOverlay` stamping `diffReviewed` on reviewed module nodes.
- `features/graph_canvas` renders a checkmark toggle on diffed module cards (L1/L1.5 and L2; `data-diff-review-toggle` intercepted before selection like the connection toggle); reviewed modules dim to the unchanged-module opacity.
- `features/diff_visualizer` `DiffOverlayBar` shows `Reviewed X/Y`, an expandable checklist of every changed/deleted file with an **Unmark all** top row (disabled when nothing is marked; the empty-set save removes the persisted entry), and a save-failure hint.

## Invariants

- Reviewed ids are always a subset of the active diff's affected ∪ deleted module ids (enforced at load reconciliation).
- Module id == repo-relative path, so the canvas toggle, the checklist, and the persisted document all speak the same key.
- Toggling never mutates the overlay or the graph; it only replaces the reviewed set and re-stamps nodes.
