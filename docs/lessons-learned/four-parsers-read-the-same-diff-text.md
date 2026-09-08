# Four independent parsers read the same pasted diff — they must agree on file boundaries

A pasted unified diff is walked **four separate times**, each by its own line loop in `domain/diff/Private`:

| Parser | Produces |
|--------|----------|
| `pathsFromUnifiedDiff` | module highlights (added / modified / deleted / renamed) |
| `lineDiffsFromUnified` | `+`/`-` rows in L2 blocks and preview frames |
| `parseDiffImportEdges` | green/red diff edges |
| `parseDiffNotes` | Diff Notes |

Each used to re-decide *where one file ends and the next begins*, so a diff dialect one handled and another didn't produced a **partially** rendered overlay rather than an error — the hardest kind of bug to read off the canvas. They now share exactly one rule, in `scan-diff-lines.ts`; keep it that way.

## The concrete failure

Git extended headers (`diff --git a/x b/x`, `new file mode`) are optional in a unified diff. `diff -u`, and most LLM-generated patches, emit only `---`/`+++` pairs.

`pathsFromUnifiedDiff` and `parseDiffImportEdges` keyed their per-file flush **solely** on `diff --git`. Given a bare 3-file diff:

- `pathsFromUnifiedDiff` collapsed all three sections into one pending state and classified only the **last** `---`/`+++` pair at end-of-text → exactly one card highlighted.
- `parseDiffImportEdges` never set `currentSource` at all → **zero** diff edges.
- `lineDiffsFromUnified` and `parseDiffNotes` were already correct (they re-key on a changed header path), so line highlights and notes rendered for all three files.

The symptom the user sees is "only one file is highlighted", which reads like a *mapping* failure (path didn't match a module id) and sends you to `overlayFromPastedDiff` / group inference. It is a *parsing* failure one layer earlier.

## The rule

**`diff --git` is a hint, not a delimiter.** The only delimiter guaranteed present is the header pair itself: a `--- ` line that arrives **after** the current section already had its `+++ ` starts a new file. Flushing on every `--- ` is wrong — git-style sections put `--- `/`+++ ` *inside* a section that `diff --git` already opened, and would emit a phantom modification.

**A prefix does not identify a header.** A removed line whose content starts with `-- ` (SQL/Lua comment) serializes as `--- comment`, and an added `++ x` as `+++ x` — indistinguishable from a header by prefix alone. What *is* reliable is that a header is always the **pair**: `--- X` immediately followed by `+++ Y`. `scanDiffLines` (`scan-diff-lines.ts`) applies that one-line lookahead once and hands every parser a `DiffLine[]` with `header: "old" | "new" | null`; no parser may test the prefix itself.

Getting this wrong is silent and misattributed. The second symptom found in this area: `--- /dev/null` opens the *next* section while the previous one is still `inHunk`, and `lineDiffsFromUnified` mapped `/dev/null` to "not a header" — so the header fell through to the content branch and rendered a red `-- /dev/null` row on the **previous** file. "Names no file on this side" and "is not a header" are different facts; a `/dev/null` header must still be *consumed* as a header.

Two related asymmetries worth keeping in mind:

- **Which path owns an import edge.** The after-path (`+++`), because the edge exists in the new tree. A deleted file has no after-path, so its removed imports must fall back to the before-path (`---`) — `diff --git a/x b/x` used to supply this for free.
- **When pending Diff Note markers bind.** In a bare diff the header pair is also the file boundary, so `parseDiffNotes` must flush pending markers *before* `currentPath` moves on, or a note written at the end of file A lands on file B.

## Before changing any of them

Change the boundary rule in `scan-diff-lines.ts` only, and test the new dialect against **all four** parsers, not just the one whose symptom you saw. `tests/diff-bare-unified.test.ts` is the template: one fixture (modified + added + deleted, with import lines in each), asserted through `pathsFromUnifiedDiff`, `overlayFromPastedDiff`, `lineDiffsFromUnified`, and `parseDiffNotes`.
