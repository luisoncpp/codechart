# A `<button>` gutter cell inherits the row's wrapping — and the UA's `padding-inline`

`DiffCodeLine` renders the line number as a `<button>` (so a click can start a Review Note
draft). Two inherited/UA properties silently collapsed it:

1. **The row's wrapping inherits.** Preview frames set `white-space: pre-wrap` +
   `overflow-wrap: anywhere` inline on the row (`wrapLines`). Both are inherited properties, so
   the number cell wrapped too — and `anywhere` will break *between digits*.
2. **The UA gives a button `padding-inline: 6px` under `box-sizing: border-box`.** The cell's
   `flex: 0 0 18px` was a border-box basis, so 6px (left, UA) + 4px (right, inline) left **8px**
   of content — under two 11.25px monospace digits.

Result: every number ≥ 10 rendered one digit per row. The gutter of a 120-line file read
`1 2 … 9 1 0 1 1 1 2 …`, which looks like wrong line numbers, not a layout bug. Measured in a real
browser: cell height 14px for `1`–`9`, 26px for `10`/`42`, 38px for `100`, 50px for `1234`.

**What to remember**

- A styled `<button>` inside a code row must opt out of the row's wrapping explicitly
  (`white-space: pre`, `overflow-wrap: normal`) and zero the UA inline padding — a `padding-right`
  alone does not.
- Size the gutter from the file's widest number, in `ch` on the cell itself, so it tracks the
  cell's own font-size across zoom levels: `flex: 0 0 calc(<digits>ch + gap)`.
- **jsdom cannot catch this** — it does no layout, so the wrap is invisible to a render test.
  Assert the inline style (`whiteSpace`, `overflowWrap`, the `ch` basis) the way
  `react-flow-culling-is-inert-under-jsdom.md` asserts the prop. Confirm the pixel behavior in a
  real browser with `getBoundingClientRect().height` per cell.
- Same family as `inline-white-space-outranks-the-stylesheet-wrap-rule.md`: the row's inline
  `white-space` beats `graph-canvas.css`, and `.symbol-widget__ln`'s `flex: 0 0 24px` there was
  dead for the same reason.
