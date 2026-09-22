---
id: diff
label: Diff Domain
color: "#db2777"
icon: share
descriptionShort: Graph & line diff overlay
---

Compares before/after ProjectGraph snapshots, parses unified diffs into module paths and line-level rows, and detects 1:1 module renames (git headers + fingerprint fallback). Pure domain logic with no UI; it imports only domain/graph. Stamping the result onto React Flow nodes/edges lives in domain/projection, one layer up. Consumers go through the facade (index.ts); parsers and overlay builders under Private/ are private.
