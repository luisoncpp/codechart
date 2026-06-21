# Current Status

## Implemented

**Phase 9 — Dashed / soft edges** is complete — event emit/listen relationships render dashed.

- Adapter extracts `CommSignal`s (`language_adapter/typescript/signals.rs`): recurses the whole tree for `call_expression`s whose callee is in an emit (`emit/dispatch/publish/send`) or listen (`on/addEventListener/subscribe/addListener`) allowlist **and** whose first argument is a string literal (the event token). New `ParsedModule.signals` + `CommSignal`/`SignalRole` on the adapter's public surface.
- `references::classify_soft(parsed)` (`references/soft.rs`): a separate pass over the parsed modules (peer of `flag_drift`, not folded into `resolve_references`). Indexes signals by token into deduped per-token emitter/listener module sets, pairs each emitter `E` with each listener `L` where `E != L` → one `soft` edge `E → L`, `trigger:"event:<token>"`, id `${src}->${tgt}:soft:${ordinal}`. **False-positive guard:** needs a string-literal token + a match in a *different* module — a lone/self signal yields nothing. React-context deferred. `analysis::resolve_edges` appends soft edges after imports.
- Frontend: `styleEdge` renders `kind === "soft"` edges **dashed** (`strokeDasharray "6 4"`), direction color still applies. `selectors.ts` scopes `importsOf`/`importedBy` to `kind === "import"` (soft edges don't leak into import lists) + new `softEdgesOf`. `InspectionPanel` gains an **Events** section (`EventList.tsx`) showing `emits → …` / `listens ← …` + token, so every dashed edge is explainable.
- Golden fixture: planted event seam (`core/store.ts` emits `"todos:changed"` on add/toggle; `ui/App.tsx` listens) over an ambient global bus → one soft edge `store → App`, no new module/import. `store.ts` loc 21→26, `App.tsx` 11→14. Edge count 20→21 (contract + smoke tests updated).
- Tests: 6 adapter signal units + 5 `references` soft units + 1 analysis `classifies_the_planted_event_seam` → **100 Rust**. Frontend: soft-dashed `styleEdge` test + Events-panel test → **50 vitest**. lint + typecheck clean.
- Checkpoint: `analyze` golden diff reproduces the soft edge; in the canvas the `store → App` edge renders dashed and the panel's Events section names the token (verified via preview — exactly one of 21 edges carries `strokeDasharray 6,4`). Architecture: [references-analysis.md](../architecture/references-analysis.md) (`classify_soft`) + [graph-canvas.md](../architecture/graph-canvas.md) (dashed edge + Events). Flow [analyze-project.md](../flows/analyze-project.md) gains step 5c. Lesson: [soft-edge-detection-needs-token-plus-cross-module-match.md](../lessons-learned/soft-edge-detection-needs-token-plus-cross-module-match.md).

**Phase 8 — Architecture drift detection** is complete — facade bypasses are flagged.

- `references::flag_drift(&mut edges, &GroupBoundaries)` (`references/drift.rs`): a second pass over resolved edges, kept out of `resolve_references` so pure import resolution stays group-agnostic. Sets `is_violation` + emits one `architectureViolation` diagnostic when `S → T` crosses into a **private** group (target group has ≥1 facade), `T` is **not** that facade, and `S` lives **outside** the group's subtree (descendants stay inside). **Facade-less groups are public** → never flagged (no false positives for cross-cutting/shared). Diagnostic keyed `architectureViolation:<edge-id>`, links the importer module + edge, severity `warning`.
- `analysis::analyze_project` now calls `resolve_edges` (resolve → flag_drift) and derives `GroupBoundaries` from the `ResolvedGroups` via `group_boundaries`; `references` owns the input type so it stays decoupled from `grouping`.
- Frontend already rendered `isViolation` edges red (Phase 6 stub now live); `InspectionPanel` colors `architectureViolation` diagnostics **red** (vs amber) so the explanation matches the bypass edge. Selecting the violating module (`src/ui/TodoList.tsx`) shows the reason.
- Golden fixture updated: `ui/TodoList → core/store` edge is `isViolation: true` + a second diagnostic (the `architectureViolation`). Counts now 2 diagnostics; contract tests (Rust + TS), smoke test, golden diff all updated.
- Tests: 5 `references` drift units (through-facade OK / private-from-outside flagged / intra-group OK / facade-less public OK / nested-subtree descendant OK) + 1 analysis `flags_the_planted_facade_bypass_with_no_false_positives` (exactly one violation) → 88 Rust. Frontend: panel red-violation test + `styleEdge` red-stroke test → 48 vitest. lint + typecheck clean.
- Checkpoint: `analyze` golden diff reproduces the flagged edge + diagnostic; the planted bypass renders red and is explained in the panel. Architecture: [references-analysis.md](../architecture/references-analysis.md) (drift section) + [graph-canvas.md](../architecture/graph-canvas.md) (panel red). Flow [analyze-project.md](../flows/analyze-project.md) gains step 5b.

**Phase 7 — Wire end-to-end on a real project** is complete — **MVP Milestone 1 functionally done.**

- Rust IPC: `tauri_api::analyze_project(path) -> Result<ProjectGraph, String>` builds an `FsProjectSource` over the chosen folder and runs the Phase 4 pipeline; the path is used as both the fs root and the graph `root`. `BuildError` now implements `Display`/`Error` so failures cross IPC as readable strings. Registered in `lib.rs` (replaces the `get_sample_graph` stub); `tauri-plugin-dialog` added (+ `dialog:default` capability) for the native folder picker.
- Frontend: `createTauriAnalysisClient` calls `invoke("analyze_project", { path })`. `App` now wires the **Tauri** client (no more mock in production). `ProjectLoaderPanel` rebuilt around a folder picker: **Open folder…** → `pickFolder()` (Tauri directory dialog, injectable for tests) → `loadProject(path)`; **Reload** re-runs the last path; per-phase status text for idle / loading / ready / empty / failed. Auto-load of `/sample` removed — the app starts `idle`.
- Tests: 2 Rust `tauri_api` (⭐ command on the fixture reproduces the golden model with `root` patched to the path; missing folder → empty graph) bring Rust to 82. Frontend `ProjectLoaderPanel` state-machine tests (idle prompt, pick→summary, cancel stays idle) using an injected picker + `MockAnalysisClient` — 27 vitest pass; lint + typecheck clean.
- Flow: [open-project.md](../flows/open-project.md) (UI front of [analyze-project](../flows/analyze-project.md)). Lesson: [analyze-command-root-equals-path.md](../lessons-learned/analyze-command-root-equals-path.md).
- Checkpoint: in `npm run tauri dev`, pick the sample folder → live diagram; pick an arbitrary TS repo → graph + diagnostics without crashing; Reload is layout-stable. (Native-dialog/IPC path is exercised in the desktop runtime, not jsdom.)

**Phase 6 — Render canvas + inspection (TS)** is complete — ⭐ visual gate passed.

- `domain/graph` projection: pure `projectGraph(graph, layout)` → `ProjectedGraph {nodes, edges}` (React Flow models). Group/module layout boxes → typed nodes with **parent-relative** positions, parents before children; group color from `GroupNode.color` else a deterministic palette hash. Plus selectors (`findModule`, `groupOf`, `importsOf`, `importedBy`, `diagnosticsFor`).
- `GraphSessionStore` extended: now also computes/owns the `LayoutedGraph` (via an injected `LayoutEngine` on load — `empty` phase keeps `layout=null`) and `selectedId`; emits `selection-changed` alongside `phase-changed`.
- `features/graph_canvas` (React Flow `@xyflow/react` 12): custom `group` node (colored container + uppercase header + icon glyph) and `module` node (white card, `★` facade, blue selected outline), solid grey import edges (red+thick when `isViolation`, stubbed for Phase 8), `colorMode="light"`, `FitView` refit via `useNodesInitialized`. `GraphCanvasController` adapts node/pane clicks → `store.select`. Only React-Flow-aware module.
- `features/inspection_panel`: selected module's path, group, facade status, language, LOC, imports, imported-by, diagnostics.
- `app` wires `createMockAnalysisClient()` (now returns the **golden fixture** — runs the whole UI with zero Rust) + `ElkLayoutEngine` into the store; loader bar over canvas + panel when `ready`.
- Tests: 6 projection + 7 store (no-DOM: load/empty/failed phases, layout computed, selection emit/dedup/clear) + 5 canvas/inspection (node count, edge layer mounts, click selects, imports/imported-by shown) + updated smoke. All 25 vitest + lint + typecheck + 80 Rust pass. jsdom React Flow gotchas recorded in [lessons-learned](../lessons-learned/react-flow-jsdom-testing.md).
- Checkpoint (⭐): dev server screenshot compared side-by-side with `sample-img/img1.png` — nested colored containers with uppercase headers + icons, white facade-starred module cards, solid import arrows on a light canvas read the same. Promoted to [architecture/graph-canvas.md](../architecture/graph-canvas.md); new flow [select-module.md](../flows/select-module.md).

**Phase 5 — ELK layout (TS)** is complete.

- `domain/layout` deep module: public `LayoutEngine` interface + `ElkLayoutEngine` + `LayoutedGraph`/`LayoutBox` types behind `index.ts`; elkjs (`elkjs` 0.11) stays private. `layout(graph) -> LayoutedGraph` returns **absolute** boxes (`{id, parentId, x, y, width, height}`) for groups + modules plus overall `width`/`height`.
- Pipeline (private): `elk-input.ts` builds a hierarchical `ElkNode` (groups → compound nodes nested by `parentId`, modules → leaves under `groupId`, ungrouped at root; children sorted by id; sizes/spacing from `PRESETS`; edges at root with `hierarchyHandling=INCLUDE_CHILDREN`) → elkjs `layered`/RIGHT → `absolute-coords.ts` flattens parent-relative coords to absolute, splitting groups from modules by id set.
- Tests: 4 `tests/layout.test.ts` against the golden model — module nests inside its group, sibling groups don't overlap, all coords finite + positive size, deterministic across runs. All 7 vitest + lint + typecheck pass.
- Checkpoint: `npx vite-node scripts/dump-layout.ts [out.svg]` dumps the golden layout to SVG; eyeballed — `app` nests core/services/ui, `shared` + ungrouped `main.ts` sit outside, every module nests in its group, nothing overlaps.
- Promoted to [architecture/layout.md](../architecture/layout.md). No new flow doc: layout is a pure synchronous transform with no multi-file sequence to trace.

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

**MVP Milestone 1 is functionally complete** (Phases 0–7); Phase 8 (drift detection) shipped. Remaining additive fast-follows on the same contract — no rework:

- **Phase 9 — Dashed/soft edges**: event/context/pub-sub classifier → `soft` edges.
- **Phase 10 — Semantic zoom (L0/L1/L2) + `@Architecture` metadata rendering.**

## Design artifacts

- [Technical Design](../plans/TECHNICAL-DESIGN.md)
- [Implementation Plan](../plans/IMPLEMENTATION-PLAN.md)
