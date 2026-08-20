# Diff Notes

## Goal

Consume optional **Diff Note Markers** in a pasted unified diff and show them as read-only explanations in source views. Git commit and local-changes overlays stay unchanged. See `CONTEXT.md` for the glossary.

## Product decisions

- CodeChart **only consumes**. No LLM call, no copy-overlay-diff, no agent prompt, no in-app authoring, editing, or dismiss-forever.
- The overlay document remains today’s unified diff. A line whose first character is `#` (column 0) is an optional **Diff Note Marker**. `+#` and ` #` stay hunk body (added/context comments).
- Consecutive marker lines are one **Diff Note**. Strip leading `#` and one following space per line; join with newlines. The body is **Markdown for display** (paragraphs, bold, italic, inline code, links). No headings, task lists, or raw HTML.
- **Diff Note Target** = the maximal same-prefix hunk run immediately above the note: `+` → after-range, `-` → before-range, context (` `) → after-range. A replace (`-` then `+`) is two notes if both sides are explained.
- Unbound marker runs (no same-prefix run above; stacked extra run; between files; before the first hunk) are **dropped**. The overlay still applies. A **floating warning** shows the dropped `#` text, a copy icon (clipboard = those lines), and X to close. Close hides the warning for this overlay session only; re-applying the same text shows it again.
- Git / local: no new ingest UI. Their `unifiedDiff` has no markers, so they have no Diff Notes. The parser still runs on that string (no-op).
- Paste identity for **Diff Reviews** hashes the text **after stripping marker lines**, so a raw paste and the same hunks with notes keep checkmarks.
- Display: L2 module documents and document/symbol **previews** only. Start **expanded**. Collapse is local to that source view (not stored). Stack: code row → Diff Notes (document order) → Review Notes (creation order). No canvas badge, no sidebar, no guided walk.
- Chrome is a **notice** (kind label, accent bar, read-only prose), never an inline Review Note card (textarea, Done).

## Data

Notes live on the session **Diff Overlay**, parsed from `unifiedDiff`. They are not a `.codechart/` file, not `ProjectGraph`, and not Review Notes.

Suggested overlay fields (names can stay private to `domain/diff`):

```ts
type DiffNoteSide = "after" | "before";

type DiffNote = {
  path: string;       // repo-relative POSIX
  startLine: number;  // 1-based, inclusive, on that side
  endLine: number;
  side: DiffNoteSide;
  body: string;       // markdown, markers stripped
};

type DiffNoteParseResult = {
  notes: DiffNote[];           // document order
  droppedMarkerText: string;   // raw dropped `#` lines, empty if none
};
```

`GraphDiffOverlay` gains `diffNotes` plus `droppedMarkerText`. Clearing the overlay clears both. Collapse/warning-closed are view state on the session, not on the document.

## Parser

Add a pure function next to `lineDiffsFromUnified` under `domain/diff/Private/` (public via `domain/diff` `index.ts`). Walk the same unified-diff grammar:

- `diff --git` / `---` / `+++` / `@@` reset file and hunk position exactly as `parse-line-diff.ts`.
- Hunk body: ` `, `+`, `-` update old/new line counters; `\` is ignored; `#` does **not** move counters (already true in `lineDiffsFromUnified` — keep it that way).
- A marker run starts at column-0 `#` and continues while the next lines are also markers. Bind to the contiguous same-prefix run immediately above inside the current hunk. No run → drop that marker text into `droppedMarkerText`.
- Two marker runs with no hunk body between them: first binds; second is dropped.
- Whitespace-only bodies after strip are dropped and warned.
- Attach notes in `attachLineDiff` (every overlay build). Paste, git, and local share one path.

Do **not** change `pathsFromUnifiedDiff` / `parseDiffImportEdges` beyond proving `#` lines cannot become fake imports or extra paths.

## Paste identity

`pasteDiffId` in `state/graph-session/Private/diff-review-id.ts` must hash marker-stripped text. Stripping is: drop lines whose first character is `#`. Existing `paste:<hex>` fixtures/tests that use marker-free text stay stable.

## Source UI

Shared seam: `DiffCodeLines` (L2 + previews). Do not fork a second renderer.

- After-side notes: insert after the last **add/context** row of the target range (`endLine` matches that row’s `lineNumber`), **before** `InlineReviewNotes`.
- Before-side notes: insert after the last **remove** row of the target range. Review Notes remain forbidden on remove rows (`showNotes` stays false for them).
- Remove rows today have no line number (`DiffDisplayRow` kind `"remove"`). Give them the before-side line number so binding can match. Do not make remove rows selectable for Review Notes.
- Notice: kind label `Diff Note`, accent bar, chevron collapse, read-only Markdown. Counter-scale with zoom like Review Notes (`--review-note-scale` pattern).
- Markdown: a **private** `marked` instance (same rule as `MarkdownBody`: never the shared default). Allow only paragraph / strong / em / codespan / link. Escape HTML; no wiki-link extension (that is architecture-doc chrome).

Put notice components under `features/diff_visualizer` (or a tiny nested deep module if the folder would otherwise exceed the 200-line / “only public interface” rules). `features/review_notes` must not own Diff Notes.

## Floating warning

When `droppedMarkerText` is non-empty and the warning is not closed for this overlay, render a floating panel (not the Diff Overlay bar, not `DiffModal` error): warning copy, copy icon, X. Copy writes `droppedMarkerText`. X is view-only. Clearing or re-applying the overlay resets the closed flag.

## Delivery sequence

1. Parser + `DiffNote` types + attach on `GraphDiffOverlay`; tests for bind/drop/`#` not shifting hunk line numbers / not creating import edges.
2. Strip markers in `pasteDiffId`; tests that raw vs annotated same hunks share an id, and that editing a `+`/`-`/` ` line does not.
3. Before-line numbers on remove display rows; `DiffCodeLines` stacks Diff Notes above Review Notes, including on `-` rows.
4. Notice chrome + constrained Markdown + default expanded / local collapse.
5. Floating warning (copy + close) wired from session overlay state.
6. `npm run check`, then `npx fallow audit`.
7. Architecture + flow docs (extend `visualize-diff.md`, `diff-reviews.md` identity, `graph-canvas` source-view note; add a short `diff-notes.md` architecture page). Update indexes. Move this plan to `docs/plans/done/`.

## Required tests

- Parser: after-run, before-run, context-run; replace split into two notes; stacked second run dropped; markers before first hunk dropped; `+#` / ` #` not markers; blank `#` body dropped; CRLF.
- Regression: annotated paste does not add/remove modules or import edges vs the stripped patch; `lineDiffsFromUnified` line numbers identical to the marker-free patch.
- `pasteDiffId`: identical hex with/without markers; different hex when a hunk line changes.
- Source UI: notice after add/context; notice after remove; Review Note still below; collapse does not persist across remounts of a new view; git/local overlay fixtures still have empty `diffNotes`.
- Warning: shown iff dropped text; copy payload; close hides; re-apply shows again.

## Explicit non-goals

- Guided Review Order / Diff-Path Tracing / next-beat `focusOn`
- Loading annotated text onto a git or local overlay
- Generating or copying an explanation prompt
- Canvas badges, sidebar lists, persisting notes or collapse
- Interleaving notes inside hunks as `+`/`-` lines
- PR comment import, collaboration, or a second note-taking system
