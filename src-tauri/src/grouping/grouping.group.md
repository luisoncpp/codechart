---
id: grouping
label: Grouping
color: "#0891b2"
icon: folder-tree
facades:
  - mod.rs
descriptionShort: Files → nested group tree
architectureDoc: docs/architecture/config-grouping.md
---

Pure resolver: `resolve_groups(files, defs)` → group nodes, per-module assignment, facades, and `configError`s. Membership via folder ownership, globs/regex, explicit files, and `groups` refs; overlaps are errors.
