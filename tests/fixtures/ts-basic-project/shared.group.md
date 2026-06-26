---
id: shared
label: Shared
color: "#f59e0b"
icon: share
disconnected: true
match:
  - "src/**/types.ts"
files:
  - src/core/todo.ts
descriptionShort: Cross-cutting types
---

Cross-cutting type modules pulled from multiple folders: services/types.ts via a glob (`match`) and core/todo.ts via an explicit `files` entry. The core and services groups cede these files via `exclude`, so claims stay disjoint (no overlap). Declares no facade, so its members are public to every group (drift detection never flags imports into it).
