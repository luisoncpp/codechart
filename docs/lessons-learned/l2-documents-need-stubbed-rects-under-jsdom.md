# L2 documents render nothing under jsdom until rects are stubbed

`L2DocumentNode` and `GroupL2Description` only mount their scrollable bodies when
`useL2ClampedLayout` reports `inFov`, and that comes from `calculateVisibleBounds`, which compares
`getBoundingClientRect()` of the node against `.react-flow`. jsdom returns an all-zero rect, so
`bottom > 0` is false, `inFov` stays false, and **every L2 body is absent from the DOM** — no
source rows, no markdown panel, no line counters inside them.

This is why the repo tests L2 geometry purely (`tests/l2-clamped-layout.test.ts`) and why no flow
test used `setZoomLevel(2)` before. If a behavior genuinely lives at L2 (a click target inside a
module document, for example), stub the rect for the duration of the test and restore it:

```ts
const restore = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, bottom: 800, right: 800,
  width: 800, height: 800, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
try { /* render, zoom to 2, assert */ } finally {
  Element.prototype.getBoundingClientRect = restore;
}
```

`tests/setup.ts` already forces `offsetWidth`/`offsetHeight` to 800 but deliberately leaves rects
alone — do not move this stub into the shared setup, or every existing test starts rendering L2
content it never rendered before.
