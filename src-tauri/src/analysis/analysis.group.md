---
id: analysis
label: Analysis
color: "#2563eb"
icon: workflow
facades:
  - mod.rs
descriptionShort: Full pipeline → ProjectGraph
---

Deep module composing Phases 2–4: discover groups, parse sources (partial results), resolve grouping and references, build validated `ModuleNode`s and edges. The IPC layer and CLI see only `analyze_project`.
