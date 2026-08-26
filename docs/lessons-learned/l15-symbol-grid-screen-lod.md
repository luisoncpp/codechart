# L1.5 symbol grids need per-card screen LOD, not just in-module paint

Moving exported symbols from React Flow child nodes into `ModuleNodeView` fixed module-grain culling, but a large project at L1.5 still has hundreds of visible module cards — and each card was mounting its full `.symbol-box` grid. Thousands of DOM boxes inside on-screen modules stayed expensive even though the labels are world-sized 9px text (~8px on screen at camera zoom 0.9).

**Fix:** keep `data.symbols` on the projected node (level still starts at zoom 0.9) but gate `ModuleSymbolBoxes` with `symbolsFitOnScreen(worldW, worldH, cameraZoom)` — skip the grid until the card's shorter side is ≥100px on screen. Do **not** also require 9px labels to reach 12px on screen: that floor needs zoom ≥ 1.33, so every L1.5 card from 0.9–1.33 shows an empty reserved band (see `l15-font-floor-empties-symbol-bands.md`). Card chrome (bold filename, description) still renders at L1.5 entry zoom.
