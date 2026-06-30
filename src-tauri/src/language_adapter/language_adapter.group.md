---
id: language_adapter
label: Language Adapter
color: "#0d9488"
icon: code
facades:
  - mod.rs
descriptionShort: One file → ParsedModule seam
architectureDoc: docs/architecture/language-adapter.md
---

`LanguageAdapter` trait and `registry_for(ext)` picker. TypeScript, Rust, C#, CSS, and Unity prefab implementations stay private; parsed facts (imports, exports, signals, implements) feed the references pass.
