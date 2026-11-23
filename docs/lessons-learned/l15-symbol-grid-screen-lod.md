# L1.5 symbol grids: paint them in the module card, and don't add a card-size gate

Moving exported symbols from React Flow child nodes into `ModuleNodeView` fixed module-grain culling (`onlyRenderVisibleElements`). A per-card screen gate followed (`symbolsFitOnScreen`: skip the grid until the card's shorter side reached 100px on screen). It was meant to keep hundreds of visible compact cards from each mounting a `.symbol-box` grid.

**The gate was removed (2026-11-10).** It hid symbols on small cards from zoom 0.9 to about 1.1 while the 8px description on the same card was already readable, so users saw cards with text but no symbols. And it saved little: a card is compact *because* it has few symbols (layout sizes cards to their grid), so the cards it skipped were the cheap ones. Large, symbol-heavy cards passed the gate anyway.

**Rule:** L1.5 symbols paint wherever the card description paints. If L1.5 performance regresses on huge projects, cap total painted boxes (or cull by viewport) rather than hiding symbols that sit next to visible text. See also `l15-font-floor-empties-symbol-bands.md`.
