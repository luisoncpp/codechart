---
id: preview_frames
label: Preview Frames
color: "#0d9488"
icon: code
descriptionShort: Multi-frame document and symbol source previews
---

Owns document previews opened from the module context menu and L1.5 symbol-definition previews: open/close/drag/z-order state, pin/unpin state, cursor and adjacent placement (right → below → above → overlap-right), L2 document composition, imported-symbol navigation between frames, and the per-frame find bar (Ctrl/Cmd+F, component-local state). Outside clicks and canvas move-start events close only unpinned frames; opening another preview also preserves pinned frames and arms a one-tick close grace so the opening gesture cannot dismiss the new frame, while an explicit frame close always closes that frame. It also opens wiki-link destinations — any project file, module or not, with markdown rendered as prose behind a raw-source toggle. Public surface is `index.ts` (`usePreviewFrames`, `findSymbolLine`); placement math, the resolver, the find logic, and the widget are private.
