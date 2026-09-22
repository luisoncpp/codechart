---
id: graph
label: Graph Domain
color: "#7c3aed"
icon: cube
descriptionShort: ProjectGraph model & selectors
architectureDoc: docs/architecture/graph-canvas.md
---

The frontend ProjectGraph data model (modules, edges, groups, diagnostics) plus its selection selectors. Pure domain logic with no UI, and the **bottom of the domain DAG**: it imports no other domain module (the React Flow projection lives in domain/projection). Consumers go through the facade (index.ts). Structured into subgroups: the ts-rs generated contract types (model/), the view-reduction passes (zoom/tests/disconnect), and the heatmap scores; selectors and symbol-kind helpers stay at the top level.
