# Static world-space edge paths — do not rewrite `d` on pan

## What is counter-intuitive

The custom `EdgeLayer` portals into `.react-flow__edges`, which already sits under React Flow's CSS transform on `.react-flow__viewport`. World-space SVG `d` attributes should stay **static** while the camera pans — the compositor moves the layer, not the geometry.

Rewriting `d` every pan (even after merging strokes per style bucket) defeats SVG raster caching and was the remaining pan cost once per-bucket merge dropped thousands of individual `<path>` elements.

## AABB cull vs merge

Per-segment AABB cull against the padded visible rect cut DOM count when every edge was its own `<path>`. Merged bucket paths already solved that bottleneck; per-frame imperative `d` writes did not.

Even a single unculled merged `d` is expensive at idle/first paint — SVG still tessellates unused subpaths (~3738 cubics / ~400k chars on typerpg+ELK). **Clip** merged `d` to the inflated visible rect on clip-cell change; pan within the same cell stays CSS transform only. Do not restore per-frame AABB `d` rewrite.

## Pan vs LOD

- **Pan:** subscribe to RF `transform` inside `EdgeLayer` (rAF-throttled) only to detect clip-cell changes and arrow-LOD threshold flips — never `setAttribute("d")` every pointermove, never `GraphCanvas.onMove` `setState` (see `drag-via-react-state-rerenders-whole-canvas.md`).
- **Arrow LOD:** when zoom crosses `showArrowHeadsAtZoom` (≥ 1.5), call `onViewportModel` once (coalesced per rAF) so React owns arrow children via `showArrows`. Do not imperatively write arrow DOM when refs exist — a later `GraphCanvas` re-render would wipe stale imperative children.

Geometry rebuilds (`writeGeometry`: stroke `d`) run on graph/layout changes and on clip-cell change; pan within the same clip cell does not call `writeGeometry`. Arrow and cross heads are rendered declaratively by React in `EdgeBucketSvg`.

## Testing

Assert `buildStaticEdgeModel` / `mergePathD`, clip-cell math (`clipCellKey`, `sameClipCell`), arrow zoom gating, and subscribe wiring — not per-pan DOM `d` updates (jsdom culling is inert; see `react-flow-culling-is-inert-under-jsdom.md`).
