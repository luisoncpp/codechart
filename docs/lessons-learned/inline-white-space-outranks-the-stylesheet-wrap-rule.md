# An inline `white-space` outranks the stylesheet's wrap rule — the CSS reads as live and is dead

`.symbol-widget__line` had said `white-space: pre-wrap; word-break: break-all` since the preview
frame was written. It never applied: `DiffCodeLine` — the shared row component behind **both** the
L2 card code block and the preview frame — sets `whiteSpace: "pre"` in its inline `style` object,
and an inline declaration beats any class selector short of `!important`.

So preview frames scrolled sideways on any file with one long line. The
`@Architecture(descriptionShort="…")` header comment is exactly that: a ~200-char single line
measured at **1491px of content inside a 680px body**. The symptom reads as a *resize* bug because
the horizontal scrollbar is what you notice while dragging the frame's `resize: both` corner, and
because most files never have a line long enough to trigger it.

**What applies to future work:**

- **A shared row/leaf component that sets a layout property inline silently disables that property
  for every stylesheet in the project.** The CSS still parses, still shows up in a grep, and still
  reads as the authored intent — nothing marks it as overridden. When one component is rendered
  under several class prefixes (`lineClassPrefix`), per-prefix CSS is the natural way to vary it and
  the natural way is unavailable. Make the variation an explicit prop (`wrapLines`) so the two
  call sites state their own choice, rather than leaving a rule that looks load-bearing but isn't.
- **Prefer `overflow-wrap: anywhere` over `word-break: break-all` for code.** `break-all` breaks
  mid-identifier even where a space boundary would have fit; `anywhere` only breaks a token that
  cannot fit on its own.
- **A "resize" symptom can be a static overflow.** Measure `scrollWidth` vs `clientWidth` at the
  default size before assuming the resize path is involved — here nothing in the codebase handles
  resizing at all (native CSS `resize`), which was the first clue.
