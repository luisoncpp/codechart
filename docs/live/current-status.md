# Current Status

## What is Implemented

Nothing yet - project is in the **design phase**.

## Design artifacts

**Canonical (chosen) plan** — synthesized from the two proposals below, taking the best of each:

- [Technical Design](../plans/TECHNICAL-DESIGN.md) — domain model, the `ProjectGraph` contract, Rust
  & React deep modules, seams.
- [Implementation Plan](../plans/IMPLEMENTATION-PLAN.md) — test-gated phases, per-phase
  user-verifiable checkpoints, the golden-fixture + sample-image North Stars.

Source proposals (reference): [GPT](../plans/GPT/TECHNICAL-DESIGN-AND-IMPLEMENTATION-PLAN.md),
[CLAUDE](../plans/CLAUDE/TECHNICAL-DESIGN.md).

Locked decisions: React + React Flow + ELK frontend, Rust/Tauri analysis backend, MVP = static graph
from one TypeScript project, TypeScript/TSX as the first language. Diagnostics are first-class data;
TS contract types are generated from Rust via `ts-rs`.
