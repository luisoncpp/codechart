---
id: graph
label: Graph Domain
color: "#7c3aed"
icon: cube
descriptionShort: ProjectGraph model & projection
---

The frontend ProjectGraph data model (modules, edges, groups, diagnostics) plus its projection to React Flow nodes/edges and selection selectors. Pure domain logic with no UI. Consumers go through the facade (index.ts); projection and selectors are private.
