---
id: language_adapter
label: Language Adapter
color: "#0d9488"
icon: code
facades:
  - mod.rs
descriptionShort: One file → ParsedModule seam
---

`LanguageAdapter` trait and `registry_for(ext)` picker. TypeScript and Rust tree-sitter implementations stay private; parsed facts (imports, exports, signals, implements) feed the references pass.
