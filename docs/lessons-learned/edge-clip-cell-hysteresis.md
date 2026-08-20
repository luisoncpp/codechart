# Edge clip-cell hysteresis — key from tight rect, filter from inflated rect

## What is counter-intuitive

Viewport clip hysteresis needs **two** rects:

1. **Key** from the tight padded `visibleWorldRect` — `clipCellKey` uses `floor(x/cell)` / `floor(y/cell)` plus a **scale-sensitive** size term (`round(cell)`). Cell-count width/height in the key (`ceil(rect.width/cell)`) stay ~2 on square viewports at every zoom, so zoom-out never rebuilds clipped `d` and edges pop.
2. **Filter** from `inflateClipRect(tight, cellSize)` — one cell of padding so intra-cell pan does not drop segments that straddle the tight edge.

Pan within the same clip cell must not rewrite merged `d` (CSS transform only). Zoom or a large pan that crosses `floor(x/cell)` must rebuild clipped paths.

## Testing

Pure math in `edge-viewport-clip.test.ts` (square viewport zoom 1 vs 2 must differ). Controller wiring in `edge-layer-viewport-flush*.test.ts` — not DOM path counts under jsdom.
