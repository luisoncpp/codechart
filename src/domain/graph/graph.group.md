---
id: graph
label: Graph Domain
color: "#7c3aed"
icon: cube
descriptionShort: ProjectGraph model & projection
architectureDoc: docs/architecture/graph-canvas.md
---

The frontend ProjectGraph data model (modules, edges, groups, diagnostics) plus its projection to React Flow nodes/edges and selection selectors. Pure domain logic with no UI. Consumers go through the facade (index.ts). Structured into subgroups: the ts-rs generated contract types (model/), the React Flow projection, the view-reduction passes (zoom/tests/disconnect), and the heatmap scores; selectors and symbol-kind helpers stay at the top level.
