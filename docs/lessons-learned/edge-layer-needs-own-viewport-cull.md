# EdgeLayer needs its own viewport cull — RF node culling does not shrink a custom SVG overlay

## What is counter-intuitive

`onlyRenderVisibleElements` culls **React Flow nodes**, not a custom SVG edge layer portaled into `.react-flow__edges`. After module-grain node culling, L1.5 still mounted ~3700 individual `<path>` elements — that DOM count was the remaining bottleneck, not node paint.

## Markers vs merged paths

`marker-end` on a merged multi-subpath `d` only marks the **last** endpoint. Batching strokes per style bucket means dropping SVG markers at overview and drawing batched arrowhead geometry (`mergedArrowPath` via `arrowHeadPath`) as a single `<path>` per bucket once an 8px world head is ≥4.4px on screen (zoom ≥ 0.55 — Level 1 card view shows arrows; overview/bird's-eye zooms ≤ 0.45 hide arrows to prevent clutter). Removed-diff X heads (`CrossHead`) live in the full static cross set per bucket.

## Pan must stay out of GraphCanvas setState

Viewport changes subscribe to RF `transform` / `width` / `height` inside `EdgeLayer` (rAF-throttled). Pan does **not** rewrite path `d` every frame — the portal is already under RF's CSS transform (see `static-edge-paths-no-pan-d-rewrite.md`). Clipped merged `d` rebuilds on clip-cell hysteresis (see `edge-clip-cell-hysteresis.md`). Driving viewport work from `GraphCanvas.onMove` `setState` would re-render the whole canvas on every pointermove (see `drag-via-react-state-rerenders-whole-canvas.md`). Arrow LOD flips alone may call `onViewportModel` (coalesced per rAF).

## Testing

jsdom cannot assert viewport cull via DOM path counts — culling is inert there too (see `react-flow-culling-is-inert-under-jsdom.md`). Test `buildStaticEdgeModel`, `mergePathD`, clip-cell math (`clipCellKey`, `sameClipCell`), arrow zoom gating, and controller subscribe wiring instead.

Geometry still rebuilds from the full projected `nodes` + `nodeLookup` on graph/layout changes; viewport work clips the merged `d`, not RF node culling.
