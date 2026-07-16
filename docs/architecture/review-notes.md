# Review Notes

Review Notes are versioned, project-local review reminders in `.codechart/review-notes.json`. They are deliberately outside `ProjectGraph` and `GraphSessionStore`: source analysis remains a stable graph contract, while notes remain editable project data.

## Responsibilities

- `src-tauri/src/review_notes` owns v1 validation, strict project-relative POSIX paths, anchor reconciliation, and same-directory atomic persistence.
- `ipc/review-notes-client` transports complete documents through Tauri or an in-memory client.
- `state/review-notes` owns the current project/document, load and save state, drafts, serialized saves, retryable latest snapshots, five-second Undo, filters, counts, atomic single/batch resolution, and preview-navigation requests.
- `features/review_notes` supplies the shared inline source disclosures and Review Notes sidebar content.
- `features/graph_canvas/Private/review-note-canvas` overlays note counts and adapts one-shot sidebar navigation into module focus plus preview opening.
- `App` composes this independent store after a graph becomes ready and passes it to the canvas and sidebar.

## Persistence and reconciliation

The document is v1 JSON. Every note has a unique opaque id, nonblank plain-text body, one-based inclusive range, matching anchor-line count, and a normalized project-relative POSIX path. Malformed or unsupported-version files return an error unchanged.

On each project load, reconciliation uses only supported modules: keep an exact recorded range; otherwise find one unique exact same-file block; then one unique whitespace-normalized same-file block. Only after the original file disappears does it search supported modules for a unique move/rename match. It deletes ambiguous, missing, or unsupported anchors and persists resulting moves/deletions immediately.

## Presentation and navigation

The shared L2/preview line renderer exposes buttons only for current or added rows and decorates every overlapping anchor. It renders each Review Note in normal flow directly after its final anchor row; same-row notes retain creation order, and expanded notes move later source rows downward. Existing notes start expanded but can collapse locally per source view. Draft text stays local until submission; existing body edits debounce, while create, Done, Undo, and reconciliation save immediately.

The Review Notes tab exposes Resolve on every displayed note and Resolve all for the current panel filter. Both remove active notes in one immediate document mutation; a bulk action creates one five-second Undo opportunity that restores the batch in its original order.

`GraphCanvas` applies note counts as a display-only overlay after graph projection. Modules count notes by path; groups aggregate descendant modules from the full graph, including modules hidden from the current canvas. Badge data attributes are intercepted before normal node controls and open the sidebar filter. Sidebar navigation resolves the note path against the full graph, focuses and centers its owning module (expanding collapsed ancestors when necessary), then opens or raises the matching document preview centered on its active range. Navigation requests are one-shot: the canvas consumes the request sequence before focusing or opening the preview, and project loads or deleting the referenced note clear any pending request.
