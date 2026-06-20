# Current Status

## Implemented

**Phase 1 — Contract + golden fixture** is complete (North Star locked).

- `ProjectGraphBuilder::build()` now returns `Result<ProjectGraph, BuildError>`, enforcing the five §2.2 invariants (sibling overlap / group-tree, multi-group membership, foreign facade, dangling edge, non-deterministic ids). Validation lives in `contract/validate.rs`.
- Reference fixture `tests/fixtures/ts-basic-project/` (13 modules, 5 groups): short import chain, one unresolved import (`./cache`), one facade bypass (`ui/TodoList → core/store`), one `@Architecture` block (`services/http.ts`).
- Groups are declared by co-located `*.group.md` files (YAML frontmatter + markdown body) — see TDD §7. This replaced the centralized `codechart.config.json`; the `project_config` loader/parser is Phase 3 work. Membership has three sources (folder ownership, glob/regex `match`, explicit `files`, `groups` references) plus an `exclude` filter; claims must be **disjoint** (overlap → `configError`, no precedence), and facade-less groups are public. The fixture exercises all of them: folder ownership (core/services/ui), a `groups`-composed aggregate `app` nesting the three, and a cross-cutting facade-less `shared` group pulling `core/todo.ts` (files) + `services/types.ts` (glob) — with `core`/`services` ceding those files via `exclude` so nothing overlaps.
- Golden North Star `tests/fixtures/golden/project-graph.json` — hand-authored expected analysis (20 import edges, 1 `unresolvedImport` diagnostic, module + group annotations). Scope/decisions documented in the fixture `README.md`.
- Contract tests load the real golden JSON on **both** sides; Rust additionally re-feeds it through the builder to prove validity. Builder has positive + 7 negative (one-per-invariant) tests.
- Contract subsystem promoted to [architecture/contract.md](../architecture/contract.md).

**Phase 0 — Skeleton & harness** is complete.

- Tauri + React + TS + Vite workspace scaffolded.
- Deep-module folder stubs created on both sides (`src/domain/*`, `src/features/*`, `src/ipc/*`, `src/state/*`, `src-tauri/src/*`).
- Rust `contract` types with `ts-rs` derive; TypeScript mirror generated into `src/domain/graph/`.
- `ProjectGraphBuilder` skeleton (invariants gated for Phase 1).
- `ProjectSource` trait + `FsProjectSource` + `MemoryProjectSource`.
- `AnalysisClient` interface + `MockAnalysisClient` + `TauriAnalysisClient` stub.
- `GraphSessionStore` class + `useGraphSession` adapter.
- Project-loader screen auto-loads a sample project and renders `N modules, M edges, D diagnostics` from a Rust-originated `ProjectGraph`.
- `npm run check` runs lint, typecheck, vitest, and `cargo test` (with TS contract export).
- Contract test parses a trivial `ProjectGraph` JSON on both Rust and TypeScript sides; smoke tests per suite pass.

## Verification

- `npm run check` passes.
- `npm run tauri dev` builds and launches the app; the sample graph flows Rust → IPC → React and is rendered as summary stats.

## Next

**Phase 2 — TypeScript language adapter (Rust)**: extract imports/exports/comment ranges from real `.ts/.tsx` files; parse `@Architecture` annotations.

## Design artifacts

- [Technical Design](../plans/TECHNICAL-DESIGN.md)
- [Implementation Plan](../plans/IMPLEMENTATION-PLAN.md)
