---
id: preview_frames
label: Preview Frames
color: "#0d9488"
icon: code
descriptionShort: Multi-frame document and symbol source previews
---

Owns document previews opened from the module context menu and L1.5 symbol-definition previews: open/close/drag/z-order state, cursor and adjacent placement (right → below → above → overlap-right), L2 document composition, and imported-symbol navigation between frames. Public surface is `index.ts` (`usePreviewFrames`, `findSymbolLine`); placement math, the resolver, and the widget are private.
