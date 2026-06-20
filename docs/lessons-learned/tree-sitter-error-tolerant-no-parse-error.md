# tree-sitter is error-tolerant — a "broken" file won't yield a `ParseError`

When testing partial-results discipline (one bad file ⇒ graph still builds + a
`parseError` diagnostic), the obvious move is to feed the adapter syntactically
invalid TypeScript. **That doesn't work:** tree-sitter is error-recovering — it
returns a tree with `ERROR` nodes rather than failing, so `LanguageAdapter::parse`
still returns `Ok`. `ParseError` is effectively unreachable from malformed source.

**What to do instead:** exercise the `parseError` path via a **read failure**, not
a parse failure. In `analysis::tests` a tiny custom `ProjectSource` lists a file
but returns `Err` from `read_file` for it — `analyze_project` then emits
`parseError:<path>`, drops the file, and builds the rest of the graph.

**Implication for future work:** if Phase 8+ wants to surface syntax problems as
diagnostics, it must inspect `ERROR` nodes in the tree itself — the parse step
won't hand back an error to key off. Today only unreadable files become
`parseError`s.
