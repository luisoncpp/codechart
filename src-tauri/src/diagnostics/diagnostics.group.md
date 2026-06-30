---
id: diagnostics
label: Diagnostics
color: "#ca8a04"
icon: alert-triangle
facades:
  - mod.rs
descriptionShort: Diagnostic merge & parse errors
architectureDoc: docs/architecture/references-analysis.md
---

Owns `parseError` construction and deterministic merge/sort of diagnostics from config, grouping, references, and parsing. Ids are the stable sort key.
