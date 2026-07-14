# Review Notes

## Goal

Add short-lived, local, single-user reminders attached to whole source lines. Review Notes support a revision pass; they are not discussions, durable documentation, or Git-review data.

## Product decisions

- One plain-text body per Review Note; no author, replies, mentions, Markdown, or attachments.
- A Review Note is active or deleted. **Done** deletes it; a five-second in-memory Undo can restore it.
- An anchor is one or more contiguous whole lines in one current working-tree source file.
- Current/added diff lines can be selected; removed historical rows cannot.
- Overlapping anchors are allowed.
- Notes appear in L2 module documents and draggable document/symbol preview frames.
- Click a line number to select one line; Shift-click another to extend the range. The selection offers **Add Review Note**.
- Notes render inline after their final anchor line. They begin expanded, can collapse independently within a source view, and move later rows down without widening the source viewport.
- A project-wide **Review Notes** tab lives beside **Inspector** in the existing resizable sidebar.
- Module nodes show active-note counts; collapsed groups aggregate descendant counts. A badge opens the sidebar with the matching filter.
- Saving is automatic. Text edits are debounced; create, Done, Undo, and anchor changes save immediately. Save errors remain visible and retryable.

## Storage

Store notes separately at `.codechart/review-notes.json`, as accepted in [ADR 0001](../adr/0001-store-review-notes-in-the-project.md). Do not add notes to `.codechart/config.json` or `ProjectGraph`.

Version 1 shape:

```json
{
  "version": 1,
  "notes": [
    {
      "id": "opaque-id",
      "path": "src/example.ts",
      "startLine": 12,
      "endLine": 15,
      "anchorLines": ["..."],
      "body": "Revisit this branch"
    }
  ]
}
```

Paths are project-relative POSIX paths and line numbers are one-based. Array order preserves creation order for overlapping notes. Empty/whitespace-only bodies are not stored.

Use same-directory temporary files plus atomic replacement. Promote the already-used `tempfile` crate from a dev dependency to a runtime dependency. A malformed file must be preserved and reported; CodeChart must not overwrite it with an empty collection.

## Anchor reconciliation

Reconcile on every successful project load/reload using only supported modules in the analyzed graph:

1. Keep the recorded range when its raw lines still match.
2. Otherwise, find one unique exact block in the same file.
3. Otherwise, find one unique whitespace-normalized block in the same file.
4. Only when the original path no longer exists, search all supported module files for one unique exact or normalized block; this follows a file move/rename.
5. Delete the note when no unique match exists. There is no detached state or manual reattachment.

Whitespace normalization ignores formatting whitespace while retaining the raw matched lines in the updated anchor. Every successful move updates `path`, line numbers, and `anchorLines`. Reconciliation persists moves and deletions immediately.

## Architecture

### Backend deep module

Add `src-tauri/src/review_notes/` with a thin `mod.rs` interface. It owns:

- versioned serialization and validation
- project-root path resolution
- pure line-block matching and normalization
- project-load reconciliation
- atomic file replacement

Expose narrow Tauri commands through `tauri_api`: load/reconcile notes and save a complete collection. Use request structs where argument counts would exceed project limits.

### Frontend IPC and state

Add deep modules:

- `src/ipc/review-notes-client/`: Tauri and in-memory clients
- `src/state/review-notes/`: `ReviewNotesStore` class plus a small React adapter

`ReviewNotesStore` owns the active collection, load/save phases, serialized autosaves, debounce state, the temporary Undo item, panel filtering, and source-preview navigation requests. It stays separate from `GraphSessionStore`.

`App` remains the composition root: when `GraphSessionStore` reaches `ready`, load Review Notes using the current root and module paths. Pass the notes store to the canvas and inspection sidebar. A graph reload unmounts source UI while reconciliation runs, preventing stale anchors from being edited.

### Source UI

Add a `features/review_notes` deep module. Its public surface provides:

- reviewable line selection and anchor decorations
- expandable inline-note layout
- note count projection for module/group nodes
- sidebar list/filter UI

Extend the shared line-rendering seam used by `L2CodeBlock` and `SymbolSourceWidget`; do not create separate note implementations for the two views. Removed diff rows expose no selectable line number.

Notes are inserted in normal source flow immediately after their final anchor line. This keeps note width within the source viewport and lets later lines move down when a note is expanded. Long source lines may still use horizontal scrolling, but notes do not widen the scroll range. Draft text remains local to the composer until the note is submitted.

### Canvas and sidebar integration

Apply note counts as a frontend display overlay after graph projection; do not change the Rust/TypeScript `ProjectGraph` contract. Node badges use data attributes so `GraphCanvasController` can distinguish them from selection, collapse, and connection controls.

Generalize the inspection panel chrome to **Inspector | Review Notes** tabs while preserving its current resize/hide behavior. Clicking a sidebar note sends a navigation request through `ReviewNotesStore`; `GraphCanvas` opens a document preview centered on the anchored range. Canvas badges open the Review Notes tab with a module/group filter.

## Delivery sequence

1. Implement and test the Rust file model, reconciliation, atomic persistence, and Tauri commands.
2. Add the frontend client and `ReviewNotesStore`, including autosave ordering, error state, counts, filters, and Undo.
3. Add whole-line selection and shared expandable inline notes to both source views.
4. Add the sidebar tab, note navigation, preview centering, and canvas aggregate badges.
5. Run lint, typecheck, frontend tests, Rust tests, and the full `npm run check` suite.
6. Add implemented architecture and create/manage flow docs, update their indexes and affected graph/open-project docs, then move this plan under `docs/plans/done/`.

## Required tests

- Rust: exact/stationary, same-file move, formatting-only move, renamed-file move, ambiguous/no-match deletion, overlap independence, malformed-file preservation, atomic round trip.
- Store: load/reset, serialized immediate saves, debounced edits, save retry, Done/Undo, module/group counts and filters.
- Source UI: click/Shift-click selection, blank-body rejection, overlapping stacked cards, edit/Done, removed-row exclusion, identical behavior in L2 and preview frames.
- Integration: sidebar tabs retain resize/hide behavior, note click opens the correct preview range, module/group badges filter the list, reload reconciles before editing.

## Explicit non-goals

- collaboration, accounts, authors, replies, mentions, or syncing
- resolved history or detached-note management
- notes on Git commits, removed diff rows, groups, modules as a whole, symbols as a whole, or arbitrary character spans
- editing source code, exporting review reports, or automatically changing Git ignore rules
