# Flow: create and manage a Review Note

## Trigger and entry point

Click a current or added source line number in L2 or a document/symbol preview. `DiffCodeLines` starts a one-line selection; Shift-click extends it to an inclusive whole-line range.

## Sequence

1. The shared source view opens an inline draft directly after the selected range; later source rows move down to make room.
2. Confirming nonblank plain text creates an opaque-id note and queues an immediate complete-document save. Escape cancels an empty draft.
3. Existing valid body edits debounce for 400 ms. The store permits one save at a time, coalesces later changes into the latest snapshot, and exposes Retry after a failure.
4. Done removes a note immediately. One five-second Undo restores the original array position; a later Done replaces the prior Undo opportunity.
5. A module/group badge opens the existing sidebar on a matching filter without changing canvas selection. Selecting the Review Notes tab manually shows All notes.
6. Clicking a sidebar note emits a navigation request. The canvas opens or raises its document preview and centers/highlights the anchored range.
7. A graph reload reconciles notes before Review Notes source UI becomes editable. A note-load error leaves the graph visible but renders Review Notes disabled with Retry.

## Reads, writes, and failure modes

- Reads: the loaded graph's supported module paths and each note's anchored source lines.
- Writes: `.codechart/review-notes.json` through same-directory atomic replacement; in-memory drafts, filter, Undo, and navigation state.
- No source file is modified. Removed historical diff rows are never selectable.
- A missing or ambiguous anchor is discarded during reconciliation. Malformed or unsupported-version note files are preserved and reported rather than replaced.

## Files

`review_notes` backend module; `ipc/review-notes-client`; `state/review-notes`; `features/review_notes`; `DiffCodeLines`; `GraphCanvas`; preview frames; and `InspectionPanel`.
