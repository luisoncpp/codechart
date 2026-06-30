---
id: project_config
label: Project Config
color: "#4f46e5"
icon: settings
facades:
  - mod.rs
descriptionShort: Discover & parse *.group.md
architectureDoc: docs/architecture/config-grouping.md
---

Discovers co-located `*.group.md` files, parses YAML frontmatter + markdown body into `GroupDef`s, and merges root `ignore` globs with built-in defaults.
