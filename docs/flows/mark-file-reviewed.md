# Mark file as reviewed (diff mode)

End-to-end flow for checkmarking files while a diff visualization is active.

## Trigger

While a diff overlay is active, user clicks the checkbox on a diffed module card (L1/L1.5 or L2), in the top-right header of a preview frame for a diffed file, or a checkbox row in the **Reviewed X/Y ▾** checklist in `DiffOverlayBar`. The checklist's **Unmark all** top row (disabled when nothing is marked) clears every mark at once — e.g. to start reviewing a new diff.

## Entry point

`DiffReviewToggle` (`features/graph_canvas/Private/nodes`), `FrameHeader` (`features/graph_canvas/Private/preview_frames`), or `ReviewChecklist` (`features/diff_visualizer/Private`).

## Sequence

1. Canvas card clicks land in `GraphCanvasNodeHandlers.onNodeClick`, which intercepts `[data-diff-review-toggle]` before selection (same pattern as the connection toggle); checklist rows and preview frame header checkboxes call the store directly. Both reach `GraphSessionStore.toggleDiffReviewed(moduleId)`; **Unmark all** reaches `unmarkAllDiffReviewed()`.
2. `DiffReviewTracker.toggle` flips the id in an immutable `Set` copy and starts a serialized save (`save_diff_review` upserts the entry keyed by diff id; an empty set removes it). `DiffReviewTracker.unmarkAll` empties the set, so its save removes the persisted entry.
3. Store emits `diff-changed`; `GraphCanvas` re-runs `withDiffReview(applyDiffOverlay(...), reviewedIds)`, stamping `diffReviewed` on the module node.
4. `ModuleNodeView` / `L2DocumentNode` render the toggle checked and dim the card to the unchanged-module opacity; `FrameHeader` updates its checkbox and tooltip; `DiffOverlayBar` recomputes `Reviewed X/Y` (affected ∪ deleted that are reviewed).
5. On the next `applyDiffFrom*` for the same diff id, `load_diff_review` returns the persisted paths reconciled against the current diff (stale paths dropped, result re-persisted) — marks are restored before the first `diff-changed` emission.

## Reads

- `GraphDiffOverlay.affectedModuleIds` / `deletedModuleIds` (reviewable file set)
- `.codechart/diff-reviews.json` via `load_diff_review`

## Writes

- `DiffReviewTracker.reviewed` (session-only, immutable set)
- `.codechart/diff-reviews.json` via `save_diff_review` (atomic temp-file write)

## Side effects

- Save failures are kept as `getDiffReviewError()` and shown as "review save failed" in the bar; the overlay itself is unaffected.
- `clearDiffOverlay` / project load clear only the in-memory set; the file persists.

## Files to inspect

| Piece | File |
|-------|------|
| Session API | `state/graph-session/Private/graph-session-store.ts`, `diff-review-tracker.ts`, `diff-review-id.ts` |
| Node stamping | `domain/diff/Private/apply-diff-review.ts` |
| Card toggle + dimming | `nodes/DiffReviewToggle.tsx`, `nodes/module-diff-style.ts`, `nodes/ModuleNodeView.tsx`, `l2/L2DocumentNode.tsx` |
| Preview frame toggle | `preview_frames/FrameHeader.tsx`, `preview_frames/SymbolSourceWidget.tsx`, `preview_frames/PreviewFramesView.tsx`, `preview_frames/preview-file-diff.ts` |
| Click interception | `controller/graph-canvas-node-handlers.ts` |
| Bar + checklist | `features/diff_visualizer/Private/DiffOverlayBar.tsx`, `ReviewChecklist.tsx` |
| Persistence | `src-tauri/src/diff_reviews`, `ipc/diff-review-client` |


## Common failure modes

- **Marks don't reappear** — the diff id changed (different refs, or edited paste text gets a new hash).
- **A reviewed file lost its mark** — it left the diff's affected ∪ deleted set; load reconciliation dropped it.
- **"review save failed"** — `.codechart/` not writable or the JSON is malformed; loading a malformed file errors unchanged (same policy as review notes).
