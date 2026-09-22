---
id: projection
label: RF Projection
color: "#a855f7"
icon: layout
descriptionShort: graph + layout + diff → React Flow models
---

The top of the domain layering: turns a `ProjectGraph` (domain/graph) plus a `LayoutedGraph` (domain/layout) into React Flow node/edge models, then stamps an optional `GraphDiffOverlay` (domain/diff) onto them. It owns the React Flow view-model vocabulary (`ProjectedGraph`, `RFNode`, `RFEdgeT`, `ModuleNodeData`, `GroupNodeData`, `EdgeData`).

Depends on graph, layout and diff; **none of them may depend back on it** — that one-way rule is what keeps the domain acyclic. Consumers go through the facade (index.ts).
