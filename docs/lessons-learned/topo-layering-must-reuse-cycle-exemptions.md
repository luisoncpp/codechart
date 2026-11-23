# Topo layering must reuse cycle-detection edge exemptions

Date: 2026-11-22

## What to remember

Every Rust crate is a file cycle: `mod child;` (parent → child) plus
`use super::` / `use crate::` (child → parent or `lib.rs`/`main.rs`). Cycle
detection already ignores parent ↔ direct-child edges
([rust-mod-use-super-is-not-a-cycle](./rust-mod-use-super-is-not-a-cycle.md)),
which is why the project reports 0 cycles. Any *other* pass that orders modules
by imports (Review Stack `compute_topo_layers`) sees the raw edges and finds a
cycle in every crate, unless it reuses the same exemption
(`references::is_paired_rust_parent_child`).

The old fallback ("peel the module with the fewest unplaced deps, one per
layer") hid it: Rust modules landed in single-module layers after all UI code,
and back-edges to later layers were silently dropped from `dependsOnLayers`.

Rules for any import-ordering pass:

- Filter edges with the cycle-detection exemptions first.
- Collapse what is left into SCCs and layer the condensation (longest path);
  never break a cycle by picking one node — it reorders unrelated modules and
  makes "depends on" lie.
- Test with a `lib.rs → cli/mod.rs → cli/x.rs → lib.rs` fixture, not only TS.
