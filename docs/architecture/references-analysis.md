# References & Analysis (the backend pipeline)

**Status: implemented (Phase 4; drift detection Phase 8; soft edges Phase 9; interface seams Phase 10; Tauri IPC seams).**
Source: `src-tauri/src/references/`, `src-tauri/src/diagnostics/`,
`src-tauri/src/analysis/`.

## Responsibility

Compose Phases 2–4 into the complete `ProjectGraph`. `analysis::analyze_project`
is the **deep module** the IPC layer and CLI see; the adapter, grouping,
references, and diagnostics sub-modules stay behind that seam.

## `references` — imports → edges + diagnostics

`resolve_references(parsed: &[ParsedModule]) -> ResolvedReferences { edges,
diagnostics }`. Pure; the set of known module ids is the parsed paths themselves
(id = path). For every `import`/re-export:

- **Relative** specifier (`./x`, `../x`) → resolved against known ids using the
  §7 rules (`resolve.rs`): extensionless `.ts`/`.tsx`/`.cs`, explicit extensions,
  `.js`/`.jsx`/`.mjs` (TS ESM convention → source `.ts`/`.tsx`), then
  `index.ts`/`index.tsx`/`mod.rs`. Hit → solid `import` edge. Miss → for `.rs`
  importers only, walk up parent path segments (Rust item imports such as
  `../analysis/analyze_project` where `analyze_project` is a fn in `analysis/mod.rs`,
  not a submodule file). Still no hit → `unresolvedImport` diagnostic (severity
  `warning`, no ghost edge in M1).
- **Non-relative** specifier on **non-C#** modules → external metadata: neither edge nor
  diagnostic.
- **Non-relative** specifier on **`.cs`** modules → looked up against in-project
  `declared_namespace` + `exported_symbols` using `referenced_symbols` from the
  importer (`references::csharp`). A `using` only produces edges to modules that
  export types actually referenced in the file; fully-qualified type names resolve
  without a matching `using`. Miss (e.g. `System`) → external metadata.

**Edge id** = `${source}->${target}:import:${ordinal}`. Edges are sorted by
`(source, target)`; `ordinal` disambiguates repeated same-pair imports (0-based).
`kind = import`, `trigger = "import"`. `is_violation` starts `false` and is set
by the drift pass below. Soft (dashed) edges are emitted by `classify_soft`.

## `references::classify_soft` — event soft edges (Phase 9)

`classify_soft(parsed: &[ParsedModule]) -> Vec<Edge>` (`soft.rs`). A separate
pass over the *parsed modules* (not the resolved edges), so pure import
resolution stays untouched (lessons-learned `edge-classifiers-are-post-passes`).
The adapter records `CommSignal`s — `emit/dispatch/publish/send` and
`on/addEventListener/subscribe/addListener` calls whose **first argument is a
string literal** (the event token; `language_adapter/typescript/signals.rs`).
`classify_soft` indexes signals by token into per-token emitter/listener module
sets (deduped), then for each token pairs every emitter `E` with every listener
`L` where `E != L` → one `soft` edge `E → L` (data flows emitter → listener),
`trigger = "event:<token>"`, id `${source}->${target}:soft:${ordinal}`.

**False-positive guard:** a soft edge requires a string-literal token **and** a
matching token in a *different* module. A lone emit/listen, a non-literal first
arg, or a same-module self-pair produces nothing. TDD §2.4. React-context
provider/consumer detection is deferred (context objects already surface as
import edges). Edges sorted by `(source, target, token)`; ordinal disambiguates
multiple tokens between the same pair.

## `references::classify_interface_seams` — cross-group interface seams (Phase 10)

`classify_interface_seams(parsed, &GroupBoundaries, &import_pairs) -> Vec<Edge>`
(`interface_seams.rs`). A third post-pass, peer of `classify_soft` and
`flag_drift`, wired in `analysis::resolve_edges`.

The adapter records `implements: Vec<String>` on each `ParsedModule` — the
interface/trait names from `class Foo implements IBar` (TypeScript,
`language_adapter/typescript/implements.rs`) or `impl MyTrait for MyType` (Rust,
`language_adapter/rust/implements.rs`). The classifier cross-references two indexes:

- **implementors**: interface name → set of modules with a matching `implements` entry.
- **importers**: interface name → set of modules that import a symbol by that name.

For each interface name, every `(importer A, implementor B)` pair where
**A ≠ B**, **different groups**, and **no existing direct import A→B** produces
one `soft` edge `A → B`, `trigger = "interface:<name>"`,
`id = ${source}->${target}:seam:${ordinal}`. The `:seam:` segment avoids
ordinal collisions with event-based `:soft:` edges between the same pair.

**Same-group suppression:** if A and B share the same group, a solid import
edge already models the relationship — no seam edge is emitted (TDD §2.4).

**Direct-import suppression:** `import_pairs` is the set of `(source, target)`
already resolved as solid import edges; a seam between an already-solid pair is
redundant and is skipped.

## `references::classify_tauri_ipc` — Tauri IPC seams

`classify_tauri_ipc(parsed: &[ParsedModule]) -> (Vec<Edge>, Vec<Diagnostic>)`
(`tauri_ipc.rs`). A fourth post-pass, peer of the classifiers above, wired in
`analysis::resolve_edges`.

The TypeScript adapter records `ipc_invokes: Vec<String>` — `invoke("cmd")`
calls whose first argument is a **string literal**, only when the module imports
from `@tauri-apps/api` (`language_adapter/typescript/ipc.rs`). The Rust adapter
records `ipc_commands: Vec<String>` from `#[tauri::command]` functions
(`language_adapter/rust/commands.rs`; in tree-sitter-rust, outer attributes are
**sibling statements** before the `function_item`, not children of it).

The classifier indexes invokes and commands by name, then for each matching
`(ts_module, rs_module)` pair where **TS ≠ RS** emits one `soft` edge
`TS → RS`, `trigger = "ipc:<command>"`, id `${source}->${target}:ipc:${ordinal}`.
An invoke with no matching handler → `unresolvedIpc` diagnostic (severity
`warning`), no edge.

**MVP limits:** command name must equal the Rust fn name (`rename =` not parsed);
`generate_handler![…]` not parsed. Wrapped IPC clients hide call sites behind
solid import edges — the seam is where `invoke` lives.

## `references::classify_unity_assets` — Unity prefab seams

`classify_unity_assets(parsed, &MetaIndex) -> (Vec<Edge>, Vec<Diagnostic>)`
(`unity.rs`). Post-pass wired in `analysis::resolve_edges` after Tauri IPC.

The prefab adapter records `unity_script_guids` and `unity_asset_guids`. The
classifier resolves guids through `unity_assets::index_meta_files`:
prefab → `.cs` (`unity:script:<guid>`) and prefab → `.prefab`
(`unity:prefab:<guid>`). Miss → `unresolvedUnityAsset` diagnostic. See
[unity-prefabs.md](./unity-prefabs.md).

## `references::flag_drift` — facade-bypass drift (Phase 8)

`flag_drift(&mut edges, &GroupBoundaries) -> Vec<Diagnostic>` (`drift.rs`). A
second pass over the resolved edges, kept separate from `resolve_references` so
pure import-resolution stays group-agnostic. An edge `S → T` is a **violation**
(sets `is_violation`, emits one `architectureViolation`) when **all** hold:

- `T`'s group has ≥1 facade (faceted = *private*). A **facade-less group is
  public** — imports into it are never flagged (no false positives for
  cross-cutting/shared groups, TDD §7/§10).
- `T` is **not** a facade of that group (importing the facade is the sanctioned
  path).
- `S` lives **outside** the group's subtree — `S`'s group is neither the target
  group nor a descendant of it (a module nested *deeper* than the facade's group
  is still "inside" the boundary).
- `S` is **not** a test module — paths matching `*.test.*` / `*.spec.*` or living
  under a `test` / `tests` / `__tests__` segment are skipped (tests often import
  private modules on purpose).

The diagnostic (`Severity::Warning`, `kind: ArchitectureViolation`) is keyed
`architectureViolation:<edge-id>`, links `module_id = S` (the importer at fault)
and `edge_id`, and reads `"<S> imports <T>, bypassing the <group> facade"`.

`GroupBoundaries` (module→group, group→parent, faceted groups, facade ids) is
derived by `analysis::group_boundaries` from the `ResolvedGroups` — `references`
owns the input type so it stays decoupled from `grouping`.

## `diagnostics` — normalization

Config/import findings already arrive as `Diagnostic`s. This thin module owns the
remaining `parse_error(path, msg)` constructor and `merge(groups)` — flatten,
sort by id, dedup by id — for deterministic final output.

## `analysis::analyze_project(source, root)`

`-> Result<ProjectGraph, BuildError>`. Steps:

1. `discover_group_defs(source)` → defs + configErrors.
2. Parse every adapter-supported, non-`*.group.md` file. **Partial results (D5):**
   a read/parse failure becomes a `parseError` diagnostic and the file is dropped;
   the rest of the graph still builds.
3. `resolve_groups(parsed_paths, defs)` — group tree, membership, facades.
4. `resolve_edges(parsed_modules, &groups)` — `resolve_references` for edges +
   unresolved diagnostics, then `flag_drift` for facade-bypass violations, then
   `classify_soft` appends event soft edges (imports stay sorted first).
5. Build `ModuleNode`s (`nodes.rs`): id = path, label = basename, language from
   extension (`tsx` → `Tsx`, else `TypeScript`), `group_id`/`is_facade` from the
   resolved groups, `loc` from the parse, annotation = first `@Architecture` block.
6. Feed everything through `ProjectGraphBuilder` so the five §2.2 invariants are
   enforced before the graph escapes.

`root` is recorded verbatim; module ids stay repo-relative (caller owns the
path→id relationship). Modules sorted by id; groups/edges/diagnostics already
deterministic.

## Determinism

Files parsed in sorted order; edges sorted by `(source, target)` + ordinal;
diagnostics merged + sorted by id. Same input → identical graph (the golden diff
gate depends on it).

## Checkpoint (CLI) — ⭐ backend gate

`cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- analyze tests/fixtures/ts-basic-project`
prints the full `ProjectGraph` as JSON. The Rust test
`analysis::tests::analyze_matches_the_golden_fixture` diffs it against
`tests/fixtures/golden/project-graph.json` — **must match exactly**. This single
assertion validates the entire backend.
