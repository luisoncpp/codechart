---
id: references
label: References
color: "#e11d48"
icon: git-branch
facades:
  - mod.rs
descriptionShort: Imports → edges & drift
---

Resolves relative imports to solid edges or `unresolvedImport` diagnostics. Post-passes: facade-bypass drift (`flag_drift`), event soft edges (`classify_soft`), and cross-group interface seams (`classify_interface_seams`).
