---
id: diff
label: Diff Domain
color: "#db2777"
icon: share
descriptionShort: Graph & line diff overlay
---

Compares before/after ProjectGraph snapshots, parses unified diffs into module paths and line-level rows, and stamps React Flow nodes/edges for visualization. Pure domain logic with no UI. Consumers go through the facade (index.ts); parsers and overlay builders under Private/ are private.
