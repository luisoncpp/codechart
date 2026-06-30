---
id: graph_canvas
label: Graph Canvas
color: "#16a34a"
icon: layers
descriptionShort: React Flow map renderer
architectureDoc: docs/architecture/graph-canvas.md
---

Renders the layouted graph as an interactive React Flow map (group/module views, edges, fit-view) and drives selection via its controller. Includes `Private/graph-canvas.css` for node/edge chrome. Public surface is the facade (index.ts); the views and controller internals are private.
