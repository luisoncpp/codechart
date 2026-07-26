# Per-line tokenizing silently drops every multi-line construct

The highlighter's rules look line-agnostic (`/^\/\*[\s\S]*?\*\//` happily spans
newlines), so `tokenizeCode` on a whole file highlighted block comments
correctly — and its tests passed. But the only renderer, `DiffCodeLines`, calls
the tokenizer **once per diff row** and keeps `[0]`. A lexer with no state
cannot see the closing `*/` on a later line, so `/*` fell through to the
operator rules: line 1 became `/` + `*`, the body lines became text, and only
a comment that opened and closed on the same line was ever highlighted.

Two things worth remembering:

- **Test the tokenizer at the granularity the renderer uses.** A green
  whole-text test is not evidence for a row-at-a-time caller. The regression
  test that actually failed was the one that renders `DiffCodeLines`.
- **Row-at-a-time rendering forces lexer state to be explicit.** The fix is a
  `LineTokenizer` instance carried across rows (`insideBlockComment`), with
  `tokenizeCode` reimplemented on top of it. That inverts the dependency: the
  per-line path is now the primitive, and any future multi-line construct
  (template literals, Python docstrings, heredocs) has to be carried the same
  way instead of accidentally working only in whole-text mode.

Diff `remove` rows must be excluded from the carry: they come from the
before-snapshot, so letting them open a comment would corrupt the state of
the after-snapshot lines around them.
