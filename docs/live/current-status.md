# Current Status

## Implemented

**Phase 4 — References + diagnostics + `analyze_project` (Rust)** is complete — ⭐ backend gate passed.

- `references` deep module: `resolve_references(parsed) -> ResolvedReferences { edges, diagnostics }`, pure. Resolves relative imports/re-exports (extensionless `.ts/.tsx`, explicit ext, `index.ts/tsx` — `resolve.rs`) into solid `import` edges; unresolvable relatives → `unresolvedImport` warnings (no ghost edge in M1); package (non-relative) specifiers are external metadata (no edge, no diagnostic). Edge id `${source}->${target}:import:${ordinal}`, sorted by `(source,target)` with a per-pair ordinal. Drift (`isViolation`, Phase 8) and soft/dashed edges (Phase 9) reserved, not yet emitted.
- `diagnostics` module (thin): `parse_error(path,msg)` constructor + `merge(groups)` (flatten, sort by id, dedup) for deterministic final output.
- `analysis::analyze_project(source, root) -> Result<ProjectGraph, BuildError>` composes Phases 2–4 behind one seam: discover group defs → parse sources (partial results: a read/parse failure → `parseError`, file dropped, rest still builds) → `resolve_groups` → `resolve_references` → build `ModuleNode`s (`nodes.rs`: id=path, label=basename, language from ext, group/facade from grouping, loc + first `@Architecture` annotation) → through `ProjectGraphBuilder` (enforces the five §2.2 invariants).
- CLI `analyze` subcommand: `cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- analyze tests/fixtures/ts-basic-project` prints the full `ProjectGraph` JSON (5 groups, 13 modules, 20 edges, 1 diagnostic).
- Tests: 10 `references` (resolver matrix: extensionless/explicit/tsx/index/parent, package-is-external, unresolved→diagnostic, edge id + ordinal) + 3 `analysis` (⭐ `analyze_matches_the_golden_fixture` exact diff vs golden, partial-results via an unreadable file → `parseError`, unresolved-import end-to-end). All 80 Rust lib tests + `npm run check` pass.
- Promoted to [architecture/references-analysis.md](../architecture/references-analysis.md).

**Phase 3 — Config + grouping (Rust)** is complete.

- `project_config` deep module: `discover_group_defs(source)` walks a `ProjectSource`, parses every co-located `*.group.md` (YAML frontmatter + markdown body) into `GroupDef`, and turns parse failures into per-file `configError` diagnostics (partial results). `parse_group_def(path, content)` is the pure single-file core; defaults (id from folder, label humanized, `descriptionShort` from first body paragraph) and forgiving YAML (all fields optional, unknown keys ignored) live in the private `parse.rs`.
- `grouping` deep module: `resolve_groups(files, defs) -> ResolvedGroups { groups, module_group, facades, diagnostics }`, pure + deterministic. Membership sources (folder ownership default, glob/`/regex/` `match`, explicit `files`) minus the `exclude` filter (`claim.rs`); overlap (a module claimed by ≥2 groups) → `configError:overlap:<module>`, no precedence. ParentId from explicit `groups` refs (win) or directory nesting (`nesting.rs`). Facades default to `index.ts/tsx` or explicit (unknown → `configError:facade:…`). No-config fallback infers `folder:<dir>` groups (`infer.rs`).
- `FsProjectSource::list_files` now does a real recursive walk (repo-relative POSIX paths, ignore-default dirs skipped) so the CLI can scan a project.
- CLI `groups` subcommand: `cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- groups tests/fixtures/ts-basic-project` prints the nested tree (members + facades) + ungrouped files. Verified to match the golden grouping: `app` nests `core`/`services`/`ui`, `shared` pulls `core/todo.ts` + `services/types.ts` cross-folder, `src/main.ts` ungrouped, one facade per group, 0 diagnostics.
- Tests: 9 `project_config` (full/minimal/malformed frontmatter, body→annotation, discover) + 14 `grouping` (each membership source, regex, exclude-as-filter, cross-folder cede, overlap, nesting, facade default/explicit/unknown, fallback, folder inference, end-to-end vs golden). All 68 Rust lib tests pass; clippy clean.
- Promoted to [architecture/config-grouping.md](../architecture/config-grouping.md). Fixed a latent golden bug surfaced here (recorded in [lessons-learned](../lessons-learned/group-body-becomes-descriptionlong-verbatim.md)): the golden's `app.descriptionLong` had a hyphen where the source body has an em-dash — corrected so all five group bodies now match byte-for-byte (the Phase 4 exact diff will pass).

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

**Phase 5 — ELK layout (TS)**: `domain/layout` `LayoutEngine` + `ElkLayoutEngine` (`elkjs`, nested compound nodes) producing non-overlapping coordinates against the golden model. Backend (Phases 1–4) is now complete; the two remaining gates are Phase 6 (visual) and Phase 7 (wire end-to-end).

## Design artifacts

- [Technical Design](../plans/TECHNICAL-DESIGN.md)
- [Implementation Plan](../plans/IMPLEMENTATION-PLAN.md)
