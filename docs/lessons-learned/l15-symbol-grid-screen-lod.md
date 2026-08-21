# L1.5 symbol grids need per-card screen LOD, not just in-module paint

Moving exported symbols from React Flow child nodes into `ModuleNodeView` fixed module-grain culling, but a large project at L1.5 still has hundreds of visible module cards — and each card was mounting its full `.symbol-box` grid. Thousands of DOM boxes inside on-screen modules stayed expensive even though the labels are world-sized 9px text (~8px on screen at camera zoom 0.9).

**Fix:** keep `data.symbols` on the projected node (level still starts at zoom 0.9) but gate `ModuleSymbolBoxes` with `symbolsFitOnScreen(worldW, worldH, cameraZoom)` — skip the grid until the label is ≥12px on screen and the card's shorter side is ≥100px (so compact base cards like `index.ts` facades display symbols as soon as the font is readable without requiring description inflation). Card chrome (bold filename, description) still renders at L1.5 entry zoom.
