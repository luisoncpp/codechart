---
id: preview_frames
label: Preview Frames
color: "#0d9488"
icon: code
descriptionShort: Multi-frame symbol source previews
---

Owns the L1.5 symbol source preview frames: open/close/drag/z-order state, adjacent placement (right → below → above → overlap-right), and imported-symbol navigation between frames. Public surface is `index.ts` (`usePreviewFrames`, `findSymbolLine`); placement math, the resolver, and the widget are private.
