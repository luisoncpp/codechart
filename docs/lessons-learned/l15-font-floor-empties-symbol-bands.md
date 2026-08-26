# A symbol-label screen floor must not sit above L1.5 entry zoom

L1.5 starts at camera zoom 0.9 (`levelFromZoom`). World-sized 9px symbol labels are then 8.1px on screen. Requiring ≥12px on screen before `ModuleSymbolBoxes` paints needs zoom ≥ 1.33, so the entire first third of L1.5 shows reserved empty bands under the description while the badge already reads "L1.5 · symbols". Module descriptions at 8px world still paint in that range.

**Keep:** card-size LOD (`shorter side ≥ 100px` on screen) so a sea of compact 120×90 modules at zoom 0.9 does not mount thousands of grids.

**Do not:** add a font-size floor higher than text already visible on the same card. If 8px descriptions are on screen, 9px symbol labels are readable enough to paint.
