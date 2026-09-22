---
id: projection_diff_overlay
label: Diff Overlay
color: "#db2777"
icon: share
descriptionShort: Stamps a GraphDiffOverlay onto projected nodes/edges
---

Applies a `GraphDiffOverlay` (computed by domain/diff) to already-projected React Flow models: `applyDiffOverlay` stamps `diffState` on module nodes and edges, `withDiffReview` marks reviewed files, `applySymbolDiffNodes` restores L1.5 symbol descriptors, and `placeGhostModules` lays out deleted-module ghosts.

Lives here — not in domain/diff — because it consumes the React Flow view model. Keeping it on the diff side is what used to make graph, diff and layout mutually dependent.
