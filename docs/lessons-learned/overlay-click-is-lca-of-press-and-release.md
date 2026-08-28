# Overlay click is the LCA of press and release

## Context

A modal backdrop that closes on `click`, with `stopPropagation` on the panel, looks sufficient: clicks that happen entirely inside the panel never reach the overlay.

## What was learned

HTML fires `click` on the **nearest common ancestor** of the `mousedown` target and the `mouseup` target. A native textarea resize (or any drag) that starts inside the panel and is released on the dimmed overlay therefore clicks the overlay itself. The panel never sees that event, so `stopPropagation` never runs.

Checking `event.target === event.currentTarget` on the overlay click is not enough either: for that gesture the click target *is* the overlay.

Close only when **mousedown also started on the overlay**.

## Rule of thumb

If an overlay dismisses on `click`, treat any press that began inside the dialog as not-a-dismiss, even when the matching `click` lands on the overlay.
