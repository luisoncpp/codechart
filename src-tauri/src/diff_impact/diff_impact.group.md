---
id: diff_impact
label: Diff Impact Engine
color: "#d97706"
icon: zap
facades:
  - mod.rs
descriptionShort: Topological diff layers, transitive blast radius, and delta diagnostics
---

Pure graph analysis over `ProjectGraph` diffs: computes foundation-first topological layers for changed modules, reverse-BFS transitive blast radius, and newly introduced architecture diagnostics.
