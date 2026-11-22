# A symbol-label screen floor must not sit above L1.5 entry zoom

L1.5 starts at camera zoom 0.9 (`levelFromZoom`). World-sized 9px symbol labels are then 8.1px on screen. Requiring ≥12px on screen before `ModuleSymbolBoxes` paints needs zoom ≥ 1.33, so the entire first third of L1.5 shows reserved empty bands under the description while the badge already reads "L1.5 · symbols". Module descriptions at 8px world still paint in that range.

**Update (2026-11-10):** the card-size LOD this note once kept was removed too, for the same reason (see `l15-symbol-grid-screen-lod.md`).

**Do not:** add a font-size floor higher than text already visible on the same card. If 8px descriptions are on screen, 9px symbol labels are readable enough to paint.
