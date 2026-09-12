# A held native resizer autoscrolls the scroller under it — and you cannot fight it, only avoid it

Pressing a `resize: both` corner starts a browser-internal autoscroll of the scrollable box under
the cursor. In a preview frame that box is `.symbol-widget__body`, whose bottom-right corner is the
same corner as the resizer. It advances **while the button is held with the pointer completely
still**, and it accelerates: a one-pixel drag on a 400-line file walked `scrollTop` 0 → 38 → 78 and,
on other presses, jumped straight to 10200 and then to the end of the file.

**Prove ownership before theorising.** Trapping the element's `scrollTop` setter plus `scrollTo` /
`scrollBy` / `scrollIntoView` on `Element.prototype` recorded **zero** JS writers while the offset
moved thousands of pixels. One measurement ruled out every application-side suspect at once — the
centering helper, find-bar navigation, review-note anchors.

## The dead ends, measured

Each of these was tried and rejected against a real browser, not reasoned about:

| Attempt | Result |
|---|---|
| `preventDefault()` on the corner press | Cancels the **resize**, keeps the scrolling (ran *faster*: 20974) |
| `overflow: hidden` on the body | Driven straight through — a clipped box is still scrollable |
| `pointer-events: none` on the body | No effect; the autoscroll target is chosen at press time |
| `overflow-anchor: none` | No effect — this is not scroll anchoring |
| 10px bottom gutter | Still fired in 1 of 4 presses (16px: 14px of scroll) |
| Pin `scrollTop` from a `scroll` handler | **Visible tremble** |

**Why the pin trembles, and why that was predictable.** `scroll` events dispatch *asynchronously*,
after the compositor has already scrolled and painted. The measurement that showed this: reading
`scrollTop` right after a drag returned `13` while the `scroll` listener had recorded **nothing
at all** — the event was still queued. So a correction made in a `scroll` handler is always one
paint late, and the user sees the offset jump away and snap back at the autoscroll tick rate. A
handler that fires after paint can never hide a change from the eye.

**What worked: own the gesture.** A grip element with `preventDefault()` on its `pointerdown`, doing
the resize in JS (`frame-resize.ts`), starts no native gesture, so there is no autoscroll to fight —
0 movement across 7 presses where the native resizer moved the body in half of them, with no `scroll`
event firing at all. This also proved the resizer was never special: a custom handle placed over the
body's corner reproduced the autoscroll too. It is the *press landing on a scroller* that does it.

## Owning the grip means owning the scroll corner too

A native resizer gets its corner reserved by the engine; an overlay grip lands **on top of the
scrollbar's bottom control** and swallows its clicks. Every instinct for reserving that space is
wrong, because **a native scrollbar cannot be shortened independently of its scrollport**:

- `margin-bottom` on the scroll box lifts the whole content area — the last row clips early above
  a visible band.
- The bar cannot be shortened from the inside. Verified with coloured `::-webkit-scrollbar` parts:
  `margin-bottom` on `::-webkit-scrollbar-track` shrinks only the track, and on
  `::-webkit-scrollbar-button` does nothing — the increment button stays pinned to the bar's bottom.
- A `border-bottom` on the scroll box *does* shorten the bar (a scrollbar spans the **padding** box,
  not the border box) and, painted in the box's own colour, hides the band — but the padding box is
  also where content paints, so the text still clips at the border. Same defect, better disguise.

So the space cannot be bought at all: **move the grip instead.** Offsetting it left by the measured
scrollbar width (`0` on overlay-scrollbar platforms, where it keeps the corner) leaves the scrollport
full height and the whole bar free. The corner stops being a resize target — that is the real price,
and it is smaller than clipping every frame's last line.

**What applies to future work:**

- **Distance from the scroller is a fragile fix.** The autoscroll band inflates the scroller's box by
  some Chromium-internal amount, so any gutter is a bet on a constant you cannot read. Measuring
  gave 16px → still scrolls, 10px → intermittent; "how big is the band" is the wrong question.
- **Prefer replacing a native gesture over suppressing its side effects.** CSS `resize` is 15 lines
  cheaper than a grip, but it comes with a browser behavior that has no off switch. Once a built-in
  gesture fights your layout, owning the interaction is usually the only stable outcome.
- **Intermittent means repeat the trial.** The native resizer fired in roughly half of presses;
  single-shot checks "passed" three separate times during this investigation and sent the fix
  backwards. Four trials per condition was the minimum that distinguished anything.

Related: [client-rects-are-visual-pixels-scrolltop-is-layout](./client-rects-are-visual-pixels-scrolltop-is-layout.md)
and [inline-white-space-outranks-the-stylesheet-wrap-rule](./inline-white-space-outranks-the-stylesheet-wrap-rule.md)
— the previous two "resize" reports on this frame, neither of which was about resizing either.
