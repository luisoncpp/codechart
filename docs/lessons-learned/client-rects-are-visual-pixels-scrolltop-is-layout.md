# Client rects are visual pixels; `scrollTop` is layout pixels

`getBoundingClientRect()` returns **post-transform** geometry, while `scrollTop`,
`clientHeight`, and `offsetHeight` are **untransformed layout** values. Mixing the
two in one expression produces an error of `(1 - scale) × distance`: it is
invisible for nearby targets and grows without bound for far ones.

That is how preview frames lost their centered definition line. `.symbol-widget`
opens with `animation: widget-fade-in` (`scale(0.96) → scale(1)`, 180 ms) and
`centerElementInBody` runs at 50 ms, so the frame is still ~0.6 % small. Centering
a symbol near the top looked perfect; a definition 2000 lines down landed
off-screen, requiring a manual scroll. The scale was a red herring in the sense
that nothing about the *new* frame was wrong — the reference frame was.

## What to remember

- Any element whose ancestors carry an open/close animation is transformed for
  the first frames of its life. An effect scheduled with a short `setTimeout`
  reads it mid-transform.
- Do not "fix" this by waiting for the animation to finish. Recover the live
  scale instead — `rect.height / el.offsetHeight` — and divide the visual delta
  by it. That also keeps the math correct under React Flow camera zoom, and it
  degrades to `1` under jsdom (where `offsetHeight` is `0`), so tests stay simple.
- Errors proportional to the *distance* to the target are the signature of this
  class of bug. A constant offset points at borders/padding instead (see
  [node-border-clips-absolute-sticky-children.md](./node-border-clips-absolute-sticky-children.md)).

Related: [scrollintoview-scrolls-every-ancestor-including-window.md](./scrollintoview-scrolls-every-ancestor-including-window.md),
[l2-native-scrollbars-scale-with-camera-zoom.md](./l2-native-scrollbars-scale-with-camera-zoom.md).
