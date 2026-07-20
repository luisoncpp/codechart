# CRLF bodies silently break `"\n\n"` paragraph splitting

## What happened

`first_paragraph` (`project_config/parse.rs`) split a `*.group.md` body on `"\n\n"` to derive the
`descriptionShort` fallback. Group files authored on Windows use `\r\n` line endings, so the
separator is `"\r\n\r\n"` and the split never matched — the *entire body* became the short
description (with `\n` → space, leaving stray `\r`s). Nothing errored; the symptom surfaced far
away in the UI as a "redundant tooltip": the L1 short text was visually identical to the long
description, but differed byte-wise, so equality checks downstream also failed to see the
duplication.

## Lessons

- Any text processing that splits or matches on `"\n"` / `"\n\n"` must normalize `\r\n` first
  (or the fixture/test must include a CRLF variant). Repos on Windows produce CRLF files
  routinely; LF-only unit fixtures hide the bug.
- Byte-equality is the wrong redundancy test for prose that HTML renders with collapsed
  whitespace — two strings differing only in `\r`/`\n` vs spaces render identically. Compare
  whitespace-normalized (`s.replace(/\s+/g, " ").trim()`), as `GroupDescription`'s tooltip
  suppression now does.
- A "displayed text looks duplicated" symptom in the canvas can originate in the Rust config
  parser, not the React view — check what the contract actually carries before patching the UI.
