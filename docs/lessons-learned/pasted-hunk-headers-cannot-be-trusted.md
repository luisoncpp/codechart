# Pasted hunk headers cannot be trusted

LLM-generated patches get the body of a hunk right but the `@@ -a,b +c,d @@` numbers wrong — typically a handful of lines off. Every diff parser (`parse-line-diff`, `parse-diff-notes`, …) seeds its line counters from the header, so a stale header shifts **every** row: removed lines land inside the previous function and untouched lines render green.

- Relaxed context handling ([relaxed-diff-hunk-context-lines.md](./relaxed-diff-hunk-context-lines.md)) fixes drift *within* a hunk; it cannot fix a wrong starting point.
- Fix it as a **text pre-pass** (`realignHunks`) that rewrites the headers, not inside each parser — the parsers have no file contents, and patching one parser would leave Diff Notes misaligned.
- Match the hunk's **new side** (context + `+`) against the current file: paste mode overlays the working tree, which is the after-state. Compare trimmed lines (tabs vs. spaces in pastes) and pick the match nearest the declared start, so repeated blocks don't jump to the wrong copy.
- No match ⇒ keep the header. Guessing a partial match moves correct hunks.
