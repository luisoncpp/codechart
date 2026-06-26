---
id: csharp
label: C# Adapter
color: "#7c3aed"
icon: code
facades:
  - mod.rs
descriptionShort: C# tree-sitter adapter
---

Walks C# with tree-sitter: `using`/`global using`, declared namespaces, public type exports, comment blocks, and `: IFoo` base lists into a `ParsedModule`. Namespace `using` edges resolve in the references pass.
