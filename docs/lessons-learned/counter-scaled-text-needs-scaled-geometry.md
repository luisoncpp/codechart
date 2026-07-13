# Counter-scaled text must never mix with unscaled px geometry

## Lesson

Collapsed-card text counter-scales with the camera (`fontSize: 14 * scale`, `scale = 1/zoom`), so in
**world units** the font grows as you zoom out. Any geometry applied to that text (widths, caps,
clamps) must grow with it — or be computed from the same world-unit box the fit math used.

The L0 card description had `maxWidth: DESC_BOX.maxWidth` (340 world px, unscaled) on a `14 * scale`
font. At L0 (`scale` ≈ 2–6.7) that is a ~10–20-character column on screen, while the fit heuristic
measured against the full card width — so the fit decision, the line clamp, and the actual wrap all
disagreed: narrow text slivers, wrong long/short choice, ellipsis next to empty space.

## Rule of thumb

Whenever an element counter-scales, audit every px constant in its style: it must either scale by
the same factor, or the measuring code must use the identical constant. Best pattern: the measuring
function returns the region (`{width, lines}`) and the style renders exactly that
(`collapsedDescription` in `collapsed-description.ts` → `cardDescriptionStyle` in `GroupNodeView.tsx`).

## Corollary: a layout-time reserve caps the render-time counter-scale

When layout reserves space for counter-scaled content, it must pick **one** scale to reserve at —
but the camera keeps zooming after layout. The group-title obstacle is reserved at the L0/L1
boundary scale (1/0.45), while an expanded header would counter-scale down to the canvas min zoom
(1/0.15 ≈ 6.7) when the user expands a group *below* the boundary. The same layout serves L0 and
L1 (no re-layout at the crossing), so the reserve cannot follow the zoom — instead the **render
clamps its scale to the reserved scale** (`expandedHeaderScale`), and both sides share one
measuring function (`groupHeaderFootprint`). A reserve without a matching clamp is a silent
under-reservation. Also: the estimate must use the rendered font's real glyph width — bold
uppercase is ~0.72em/char, not the 0.6 body ratio.

## Corollary: shrink-to-fit must shrink the chrome too

The L0 card title had the inverse problem: a fixed counter-scaled font (`15 × scale`) on a card
smaller than the title overflows, so it needs shrink-to-fit. But shrinking only the font barely
helps — the header's *chrome* (a `24 × scale` toggle, `6 × scale` gaps, the icon) stays huge and
eats a small card's width before the text gets any. When fitting counter-scaled text into a fixed
box, scale the surrounding chrome by `fittedFont / baseFont` instead of the raw camera scale
(`collapsedLabelLayout`'s `chromeScale`).

## Corollary: fit against visible free space, not the parent bounds

A collapsed parent group can still contain visible nested subgroup boxes. Fitting the parent title
against the full card width is therefore insufficient: the text can fit its parent and still render
under a subgroup that starts on the same row. Use the projected visible-child offsets to choose the
full-width band above the child or the child-free column beside it, and render at the exact width the
fit calculation returned. Search all readable sizes in the horizontal band before accepting a larger
font in the side column; font-size-first selection can turn an otherwise horizontal title into an
ugly one-character-per-line stack. Treat that stack as an invalid state: collapsed group titles
stay `nowrap`, shrink within the measured region, and ellipsize at the readable font floor.

Independent `minChildX` and `minChildY` values are also insufficient when they come from different
children: a low-left child and a high-right child still leave a useful top-left rectangle, but the
two minima falsely describe no free space. Preserve visible child rectangles through projection and
only constrain the title width with obstacles that intersect the candidate title row.

This minima trap recurs in **every** consumer of child geometry, not just the one that surfaced the
bug: fixing the title fit via `childObstacles` left the card *description* on the old minima math,
so groups with a low-left + high-right subgroup (Tauri Backend, Language Adapter) rendered no
description despite visible free space. When replacing minima with rectangles, grep for every other
reader of `minChildX`/`minChildY` and migrate them together (`descriptionRegion` in
`collapsed-description-region.ts` now sweeps obstacle tops as candidate region bottoms).

## Corollary: prose fit must model browser wrapping

Aggregate capacity (`characters per line × lines`) overestimates how much prose fits because words
leave unused space at line ends. A larger font can pass that area check and still be clamped after
the browser wraps at spaces or hyphens. A text fitter should greedily count the same break
opportunities as CSS before accepting a larger font; total character count alone is not a fit test.

Do not model an unbreakable identifier as several hard-wrapped lines unless the rendered CSS also
uses `overflow-wrap: anywhere`. In a narrow child-free column, reject fonts where the longest token
exceeds the measured width and shrink below the normal prose floor when necessary; otherwise the
browser clips the token exactly where the neighboring subgroup begins.

## Corollary: do not clamp text that already fits

`-webkit-line-clamp` can paint an ellipsis on the final visible line even when that line contains the
complete text, especially near fractional line-height boundaries. Preserve the fitter's result through
to rendering and add the clamp only when the selected prose actually exceeds its measured region.
