# Diff line highlights index the after-snapshot, not the live file

`FileLineDiff.addedLineNumbers` / `removeBeforeLine` are **after-snapshot** line
coordinates (the diff's "+" side). `buildModuleDiffDisplay(source, fileDiff)`
merges them positionally over whatever `source` it is handed.

The trap: the L2 code panel and the symbol source widget both read `source`
from `GraphSessionStore.sourceCache` (the **live** file at load/fetch time), a
different origin than the git diff. The moment the working tree drifts from the
diffed "after" — e.g. the user prepends a comment then visualizes, or a
commit→commit diff whose "after" ref simply differs from the checked-out
files — every highlight shifts by the line delta. An added line renders as
context and a context line renders as added.

Fix: the overlay carries `afterSourceByPath` (already fetched for symbol diff),
and the store overrides `sourceCache` for diffed paths with that snapshot while
the overlay is active, restoring on `clearDiffOverlay`. Both panels then render
the exact text the coordinates index.

Rule for future work: if you show line-level diff decorations, the source you
decorate and the source the diff was computed against must be the **same
snapshot**. Never decorate live content with coordinates from a point-in-time
diff.

Paste mode has no snapshot, and a pasted diff's header numbers match **no file
on disk** in the common case: the file is unpatched (a diff from another branch
or an LLM), or patched/unpatched **plus unrelated local edits**. A first fix that
applied the patch only when *every* hunk matched its header position still failed
on the real report — one hunk collided with a local edit (reordered attributes),
so the whole file fell back. What works (`anchorPasteDiff`): locate **each hunk
on its own** by content — after side (already applied) or before side (apply it),
nearest to where the previous hunk ended, trimming mismatched edge context like
`git apply` fuzz — then remap every after-side coordinate (added rows, removal
anchors, after-side Diff Notes) through the resulting line map. Test paste fixes
against the reporter's actual file, not a clean before/after pair.

## Why this kept regressing, and the two nets that now stop it

Every past regression (bare headers, unprefixed context, CRLF, drifted/unpatched/locally
edited files) came from a **different layer** with the **same symptom** — a `+` row whose
text is not the line the diff added — and each fix shipped an example test for its own
cause only. So the nets target the symptom, not causes:

- **Guard** (`module-diff-display.ts`, `addedTextMatches`): an added row must carry the text
  the diff added (`addedLineTexts`, compared `trimEnd`). A mismatch renders as context and
  logs one `[diff] … do not match` warning. Worst case is now a missing highlight, never a
  wrong one. **Do not remove it to "fix" a warning** — the warning means coordinates and the
  rendered snapshot disagree upstream.
- **Matrix** (`tests/paste-diff-alignment.test.ts`): the diff is *generated* from a known edit
  list, then every paste shape × live-file state × line ending runs through the real paste
  pipeline, asserting rendered `+`/`-` rows equal the edit list and the guard stays silent.
  Mutation-checked: removing anchoring, removing fuzz, a prefix-only header rule, strict-space
  context, and a non-trimming guard each fail it. **A new paste bug = one more row in
  `SHAPES` or `LIVE_STATES`**, not a new bespoke test. It found one more bug on day one:
  a pure-add hunk whose edge context was locally edited could not be anchored.
