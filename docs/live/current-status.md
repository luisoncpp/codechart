# Current Status

## Implemented

**Phase 2 — TypeScript language adapter (Rust)** is complete.

- `LanguageAdapter` trait + `ParsedModule`/`ParsedImport`/`CommentBlock` data + `registry_for(ext)` / `registry_for_path` in `src-tauri/src/language_adapter/`. TS/TSX impl uses tree-sitter (`tree-sitter` 0.24 + `tree-sitter-typescript` 0.23), kept private behind the trait.
- Extracts every TDD §7 import form (default, named w/ alias, namespace, `import type`, side-effect, mixed), re-exports (`export … from`, `export type`, `export *`), local exported symbols, and raw comment blocks. Single ordered top-level walk → deterministic output.
- `semantic_comments::parse_annotations(text)` parses `@Architecture(...)` blocks → `Annotation` (quote-aware, partial/malformed-safe). Decoupled from the adapter (no tree-sitter dep); used in Phase 10.
- CLI `parse` subcommand (from repo root): `cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- parse <file.ts|tsx>` prints imports + re-exports + exported symbols + annotations. (`codechart-cli` is a `[[bin]]` of the `codechart` package, not a workspace package — use `--bin`, not `-p`.)
- Tests: 15 adapter tests (every import/export form, JSX/TSX, MemoryProjectSource end-to-end, unsupported-ext) + 8 annotation tests (full/partial/malformed/multiple/quoted-comma). All 46 Rust lib tests + `npm run check` pass; clippy clean.
- Promoted to [architecture/language-adapter.md](../architecture/language-adapter.md).

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

**Phase 3 — Config + grouping (Rust)**: discover/parse co-located `*.group.md` files (`project_config`); assign modules to the nested group tree with facades, rejecting overlap (`grouping`).

## Design artifacts

- [Technical Design](../plans/TECHNICAL-DESIGN.md)
- [Implementation Plan](../plans/IMPLEMENTATION-PLAN.md)
