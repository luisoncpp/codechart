# Native scrollbars inside React Flow nodes scale with camera zoom

**Context:** L2 module documents render inside React Flow nodes. At L2 the camera zoom is typically
≥1.7×, and the whole node (including any native scrollbar) is painted through that transform.

**The trap:** a "thin" native scrollbar (`scrollbar-width: thin`, 8px webkit) is measured in **node-local
CSS pixels**, then multiplied by the camera zoom on screen. At 2× zoom an 8px bar reads as ~16px on
screen — fat, with OS arrow buttons, and it steals horizontal space from counter-scaled source text.

**The fix:** hide native scrollbars on `.l2-scrollable` and render **custom thumbs** whose width/height
is `desiredScreenPx / cameraZoom` inside the node. Thumbs are overlaid on the scroll viewport (not on
the content), so they stay pinned to the right/bottom edge while long lines scroll horizontally. Pair
with an absolutely positioned scroll container (`inset: 0` inside a `flex: 1; min-height: 0` shell) so
overflow is real and thumbs appear.

**Counter-intuitive takeaway:** anything drawn inside a zoomed React Flow node that should look a fixed
size on screen — text, scroll thumbs, padding — must be **counter-scaled** (`value / transform[2]`),
same as L2 typography. Native platform scrollbars cannot be counter-scaled.

**Related:** viewport-clamped L2 panels also need the inner sticky layer inset by **screen-pixel** border
thickness when sizing from `getBoundingClientRect()` — see
[node-border-clips-absolute-sticky-children.md](./node-border-clips-absolute-sticky-children.md). Wrong inset
shows up as “scroll thumbs work when clamped but disappear when the full box is on screen”.
