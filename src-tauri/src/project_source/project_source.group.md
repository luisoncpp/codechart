---
id: project_source
label: Project Source
color: "#64748b"
icon: database
facades:
  - mod.rs
descriptionShort: File listing & read seam
---

`ProjectSource` trait abstracting file listing and reads. `FsProjectSource` for disk; `MemoryProjectSource` for tests and fixtures.
