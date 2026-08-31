# References & Analysis (the backend pipeline)

**Status: implemented (Phase 4; drift detection Phase 8; import cycles; soft edges Phase 9; interface seams Phase 10; Tauri IPC seams).**
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
  `index.ts`/`index.tsx`/`mod.rs`/`lib.rs`/`main.rs`. The crate-root candidates
  let Rust `crate::...` imports resolve through root re-exports. Hit → solid
  `import` edge. Miss → for `.rs`
  importers only, walk up parent path segments (Rust item imports such as
  `../analysis/analyze_project` where `analyze_project` is a fn in `analysis/mod.rs`,
  not a submodule file).   Still no hit → `unresolvedImport` diagnostic (severity
  `warning`, no ghost edge in M1).
- **TypeScript path alias** specifier (`@/…` and other `compilerOptions.paths`
  entries from root `tsconfig.json` / `jsconfig.json`) → mapped to a repo-relative
  path via `tsconfig_paths`, then resolved like an extensionless import. Miss →
  `unresolvedImport`. Scoped npm packages (`@scope/pkg` without a matching paths
  entry) stay external metadata.
- **Relative asset** specifier (`.json`, images, fonts, media, … — see
  `resolve::is_asset_import`) → external metadata: neither edge nor diagnostic.
  Bundled fixtures and static assets are not parsed modules.
- **Non-relative** specifier on **non-C#** modules → external metadata: neither edge nor
  diagnostic.
- **Non-relative** specifier on **`.cs`** modules → looked up against in-project
  `declared_namespace` + `exported_symbols` using `referenced_symbols` from the
  importer (`references::csharp`). A `using` only produces edges to modules that
  export types actually referenced in the file; fully-qualified type names resolve
  without a matching `using`. Miss (e.g. `System`) → external metadata.
- **C++ include roots** → `.cpp`/`.h` importers first search beside the importer,
  then configured `.codechart/config.json` `unreal.knownPaths`. A bare quoted
  include that has no in-scope target is external metadata because a compiler
  include path or Unreal module dependency may supply it. Explicit `./` or
  `../` misses remain `unresolvedImport` warnings. When
  `excludeEngineReferences` is true, common Unreal Engine headers/prefixes are
  also external metadata.

**Edge id** = `${source}->${target}:import:${ordinal}`. Edges are sorted by
`(source, target)`; `ordinal` disambiguates repeated same-pair imports (0-based).
`kind = import`, `trigger = "import"`. `is_violation` starts `false` and is set
by the drift and layering passes below. Soft (dashed) edges are emitted by `classify_soft`.

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

## `references::flag_layering` — group→group layering

`flag_layering(&mut edges, &GroupBoundaries, &BTreeMap<String, LayeringRule>)`
(`layering.rs`). Post-pass immediately after `flag_drift`, before `flag_cycles`.
Solid `import` edges only (soft / IPC / seam ignored). Test importers skipped
(same as `flag_drift`). Does not clear existing facade-bypass flags.

A rule lives on an **importer** group (`mustNotImport` / `mayImport` from
`*.group.md`). It applies to every module whose group is that id or a descendant.
A named target matches that group or a descendant. Imports that stay inside the
rule-holder's subtree are never flagged. Ungrouped targets: allowlist flags them
(`… may not import ungrouped`); denylist does not.

Diagnostic (`Severity::Warning`, `kind: ArchitectureViolation`) is keyed
`architectureViolation:layer:<edge-id>` so a bypass and a layering break on the
same edge both survive `diagnostics::merge`. Message:
`"<S> imports <T>, violating layering: <from> must not import <to>"` (or
`may not import`). `<from>` / `<to>` are the **named** group ids.

`LayeringRule` is built in `analysis` from `ResolvedGroups.layering` (validated
in `grouping`); unknown config ids never reach this pass.

## `references::flag_cycles` — import-cycle detection

`flag_cycles(&mut edges, module_ids) -> Vec<Diagnostic>` (`cycles.rs`). Third
post-pass on resolved **import** edges, wired in `analysis::resolve_edges`
immediately after `flag_layering`, before soft/IPC/seam classifiers.

**C++ logical units:** before SCC, collapse same-stem impl/header pairs when an
import edge `impl → header` exists (`cpp.rs` stem helpers — same rule as
`analysis/nodes` header-export copy). Unit id = header path for a paired impl;
unpaired files keep their own path. `Player.cpp → Player.h` projects to a unit
self-edge and is dropped (never a finding, never flagged `is_violation`).

**Rust parent/child pairs:** do **not** collapse children onto the parent unit.
Skip import edges between a directory module (`mod.rs` / `lib.rs` / `main.rs`)
and a **direct** child (`D/name.rs` or `D/name/mod.rs`) in both directions
(`rust.rs` `is_paired_rust_parent_child`). That drops `mod child;` plus
`use super::…` 2-cycles without hiding sibling `A.rs ↔ B.rs` cycles.
Grandchildren (`D/name/create.rs` ↔ `D/mod.rs`) stay in the graph.

**Algorithm:** project import edges to unit→unit; Tarjan SCC on a `BTreeMap`
adjacency; report SCCs with ≥2 units plus size-1 units with a true self-include
(`A.h → A.h`). One diagnostic per **file** that maps to a cycled unit; toolbar
dedupes by `cycle-key` (sorted unit ids). Message shape:
`circular include (N modules): <witness> (others in this cycle: …)`.
Witness = **shortest elementary cycle through the highest-degree** SCC member
(lex tie-break); never unrolls or invents edges. C++ unit paths in the message
drop `.h`/`.cpp`/`.hpp`/… (logical unit id); TS/other languages keep extensions.
`(others in this cycle: …)` lists other **SCC members** not on the witness — not
inbound-only predecessors.

Sets `is_violation = true` on original import edges whose unit-projected endpoints
both lie in the same reported SCC, except dropped pair self-edges. Does not clear
existing facade-bypass flags. Soft/IPC/seam edges are ignored.

Diagnostic: `kind: CircularDependency`, `id: circularDependency:<cycle-key>:<moduleId>`,
`severity: Warning`, optional `edge_id` linking a witness import from that file.

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
   unresolved diagnostics, then `flag_drift`, then `flag_layering`, then
   `flag_cycles`, then `classify_soft` appends event soft edges (imports stay
   sorted first).
5. Build `ModuleNode`s (`nodes.rs`): id = path, label = basename, language from
   extension (`tsx` → `Tsx`, else `TypeScript`), `group_id`/`is_facade` from the
   resolved groups, `loc` from the parse, annotation = first `@Architecture` block.
   C++ implementation files also display exports from directly included same-stem
   headers, so `Foo.cpp` can show the `Foo` class declared in `Foo.h`.
6. Feed everything through `ProjectGraphBuilder` so the five §2.2 invariants are
   enforced before the graph escapes.

`root` is recorded verbatim; module ids stay repo-relative (caller owns the
path→id relationship). Modules sorted by id; groups/edges/diagnostics already
deterministic.

### `analysis::opens_file(path)` — what a source actually has to contain

Second public function of the module, for callers that pay per byte to *materialize* a
tree (today: `git::source_at_ref`, which pulls blobs out of the object database). True
for the five things the steps above open: adapter-supported files, `*.group.md`,
`*.meta`, `tsconfig.json`/`jsconfig.json`, and `.codechart/config.json`.

It lives here rather than in the caller because those five are read by five *different*
submodules of this one, and a copy elsewhere rots the day a sixth is added. Everything
else — ignore patterns, `is_unreal_project`, `deduce_known_paths`, the meta-index
candidate scan — works off the file **list**, so a caller that skips content must still
list the path. `MemoryProjectSource::with_listing` models exactly that split, and a
skipped path reads back as `NotFound` rather than as empty content, so a wrongly-skipped
file becomes a visible `parseError` instead of a silent zero-import module.

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

`check` is the CI counterpart of that dump: diagnostics only, git metrics skipped,
non-zero exit on architecture findings. See [cli.md](./cli.md).
