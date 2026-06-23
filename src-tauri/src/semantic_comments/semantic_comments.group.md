---
id: semantic_comments
label: Semantic Comments
color: "#9333ea"
icon: message-square
facades:
  - mod.rs
descriptionShort: "@Architecture block parser"
---

Scans source text for `@Architecture(key=value, …)` blocks and maps recognized keys onto `Annotation`. Quote-aware, partial/malformed-safe; decoupled from tree-sitter.
