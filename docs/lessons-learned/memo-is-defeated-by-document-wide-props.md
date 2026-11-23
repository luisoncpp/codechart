# A `memo` fed one document-wide prop never skips

Find-in-preview took >1 s per keystroke on a long file, while `findFrameMatches` itself took milliseconds. The cost was rendering: every keystroke re-rendered every row's token tree.

`L2CodeBlock` was already `memo`ized — and useless, because `SymbolSourceWidget` built `matchesByLine` (a `new Map`) and the `matchProps` object inline on every render. Below it nothing was memoized, and each row got the **whole** Map plus a fresh `chrome` object and `onLineClick` closure.

What applies to future work:

- **Search the render path, not the algorithm.** Profile which components re-render before reaching for debounce or a faster matcher.
- **Memoize the leaf that is expensive, feed it row-local slices.** `DiffCodeLine` (the token tree) is memoized; `DiffRowItem` passes `matchesByLine.get(line)`, not the Map. One shared prop that changes per keystroke re-renders every row.
- **Split "which is active" from "what matches".** Flagging `active` inside per-line arrays changes every matched row when the cursor moves. Keep the ranges stable (depend on matches only) and pass the active position separately; only the old and new rows re-render.
- **Don't memo the wrapper that hosts store-driven children.** Review Note cards (`InlineReviewNotes`) re-render via the `App` cascade on store `emit`, reading the stable store object (see `stable-store-identity-does-not-invalidate-memos.md`). Memoizing `DiffRowItem` would freeze their validation/undo UI; memoizing only `DiffCodeLine` does not.
- **`useDeferredValue` for the typed value** keeps the `<input>` responsive when one character matches most rows (no fixed latency like a debounce).
- Test it by counting renders: `vi.mock` the leaf (`TokenText`) with a counter wrapping the real component and assert the re-render count after a `rerender` (`tests/diff-code-lines-rerender.test.tsx`).
