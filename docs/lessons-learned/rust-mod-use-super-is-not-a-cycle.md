# Rust `mod` + `use super` is not a circular include

Date: 2026-08-27

## What to remember

`mod child;` is a file edge from the directory module (`mod.rs` / `lib.rs` /
`main.rs`) to the child, and `use super::Type` is an edge back. That 2-cycle is
how a Rust deep module shares types on the facade; Cargo still compiles it.

Skip those **parent ↔ direct child** edges in `flag_cycles` (same idea as
dropping `Foo.cpp → Foo.h`). Do not merge the whole folder into one cycle unit:
sibling `A.rs ↔ B.rs` cycles must still report. Grandchildren
(`lobby/create.rs` ↔ `eos/mod.rs`) are not pairs.

The analyzer is measuring a file graph, not crate-level circularity.
