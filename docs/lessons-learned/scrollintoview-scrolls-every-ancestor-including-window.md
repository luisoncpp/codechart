# `scrollIntoView` scrolls every scrollable ancestor — including the window

## What happened

The symbol preview frame centered its definition line with
`lineEl.scrollIntoView({ block: "center" })`. With a single widget placed inside
the viewport this looked fine. Once frames could open near (or past) a viewport
edge, opening one **horizontally scrolled the whole page**: every open frame's
client rect shifted left by ~440px and the app chrome moved off-screen.

## Why it is counter-intuitive

`scrollIntoView` is not scoped to the nearest scroll container. It walks **all**
scrollable ancestors — the widget body, the canvas, and ultimately the window —
and `block`/`inline` options do not restrict which ancestors move (`inline`
defaults to `"nearest"`, which is what produced the horizontal window scroll).
There is no option to say "scroll only this container".

## What to do instead

Scroll the intended container manually with rect deltas:

```ts
body.scrollTop += lineBox.top - bodyBox.top - body.clientHeight / 2 + lineBox.height / 2;
```

See `centerLineInBody` in
`src/features/graph_canvas/Private/preview_frames/SymbolSourceWidget.tsx`.
Rule of thumb: never call `scrollIntoView` on an element inside an absolutely
positioned overlay that can sit outside the viewport.
