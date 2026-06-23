---
id: diagnostics
label: Diagnostics
color: "#ca8a04"
icon: alert-triangle
facades:
  - mod.rs
descriptionShort: Diagnostic merge & parse errors
---

Owns `parseError` construction and deterministic merge/sort of diagnostics from config, grouping, references, and parsing. Ids are the stable sort key.
