# Diff Notes

Diff Notes display read-only explanations consumed from optional marker lines (`#` in column 0) in pasted unified diffs. They provide contextual explanations in source views (L2 module documents and preview frames) without modifying the underlying graph, Review Notes, or `.codechart/` files.

## Ingest & Marker Grammar

CodeChart strictly consumes Diff Notes from pasted unified diffs (no in-app authoring or editing):

- A line whose first character is `#` (column 0) is a **Diff Note Marker**. `+#` and ` #` remain hunk body comments.
- Consecutive marker lines form one **Diff Note**. Leading `#` and one optional following space (`/^# ?/`) are stripped from each line and joined with newlines.
- **Diff Note Target**: binds to the maximal same-prefix hunk run immediately above:
  - `+` run $\rightarrow$ `side: "after"`, `startLine..endLine` from new-file line counters.
  - `-` run $\rightarrow$ `side: "before"`, `startLine..endLine` from old-file line counters.
  - ` ` run $\rightarrow$ `side: "after"`, `startLine..endLine` from new-file line counters.
  - A replace (`-` followed by `+`) splits into two notes if both sides have markers.
- **Unbound markers**: markers before the first hunk, between files, stacked without intervening hunk body, or whitespace-only bodies are dropped into `droppedMarkerText`.
- Git commit and working-tree diffs do not have markers and produce empty `diffNotes`.

## Paste Identity

To ensure Diff Review checkmarks survive adding or removing Diff Notes, `pasteDiffId` (`state/graph-session/Private/diff-review-id.ts`) hashes the diff text **after stripping column-0 `#` marker lines**. A raw paste and an annotated paste of the same hunks produce identical review identity.

## Source UI & Floating Warning

- **Source rendering (`DiffCodeLines`):**
  - Rendered in L2 module documents and preview frames (`SymbolCode` / `DocumentContent`).
  - Stacks: code row $\rightarrow$ Diff Notes (document order) $\rightarrow$ Review Notes (creation order).
  - After-side notes render after the last `add` or `context` row of the target range.
  - Before-side notes render after the last `remove` row of the target range.
  - Review Notes remain disabled on `remove` rows.
- **Notice Chrome (`DiffNoteNotice`):**
  - Accent bar, kind label `Diff Note`, chevron toggle (starts expanded; collapse is local component state).
  - Counter-scales with zoom via `--diff-note-scale: 1 / zoom`.
  - Body parsed with a private `Marked` instance: allows paragraphs, bold (`<strong>`), italic (`<em>`), inline code (`<code>`), and links (`<a>`). Escapes raw HTML and excludes wiki-link extensions or task lists.
- **Floating Warning (`DroppedMarkersWarning`):**
  - Rendered on the canvas when `droppedMarkerText` is non-empty and the warning has not been dismissed.
  - Provides a copy button to write dropped marker lines to the clipboard and an X button to dismiss for the session.
  - Re-applying the diff resets the dismissed state.

## Invariants

- Diff Notes live on `GraphDiffOverlay` in session state; they are never persisted to disk or merged into `ProjectGraph`.
- Marker lines (`#`) never advance old or new line counters in `lineDiffsFromUnified` or create phantom import edges.
- Clearing the diff overlay clears all Diff Notes and dropped marker warnings.
