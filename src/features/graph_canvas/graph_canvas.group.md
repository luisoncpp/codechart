---
id: graph_canvas
label: Graph Canvas
color: "#16a34a"
icon: layers
descriptionShort: React Flow map renderer
architectureDoc: docs/architecture/graph-canvas.md
---

Renders the layouted graph as an interactive React Flow map and drives selection via its controller. Public surface is the facade (index.ts); everything else is private, structured into subgroups: node views, the SVG edge layer, group descriptions, L2 documents, source highlighting, viewport navigation, the controller + transient UI state, the toolbar/overlays, plus the nested deep modules preview_frames and project_search. `GraphCanvas.tsx` composes them; `Private/graph-canvas.css` holds node/edge chrome.
