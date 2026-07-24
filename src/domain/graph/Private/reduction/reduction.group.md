---
id: graph_reduction
label: View Reduction
color: "#6d28d9"
icon: gear
descriptionShort: Semantic zoom, test filtering & disconnect filtering
---

Pure graph-reduction passes that run before layout/projection: `projectForZoom` (collapse groups, re-route edges onto collapsed ancestors), zoom-level mapping (`levelFromZoom`, default collapse sets), `filterTestModules`, and disconnected-node edge filtering.
