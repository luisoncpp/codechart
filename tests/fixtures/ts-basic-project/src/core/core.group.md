---
id: core
label: Core
color: "#7c3aed"
icon: cube
facades:
  - index.ts
exclude:
  - todo.ts   # ceded to the cross-cutting `shared` group
descriptionShort: Domain types & state
---

Domain model and in-memory state for todos. Pure logic with no I/O or UI. Code outside this group must go through the facade (index.ts); store, todo, and validate are private.
