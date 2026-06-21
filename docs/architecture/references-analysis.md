# References & Analysis (the backend pipeline)

**Status: implemented (Phase 4; drift detection Phase 8).** Source:
`src-tauri/src/references/`, `src-tauri/src/diagnostics/`,
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
  §7 rules (`resolve.rs`): extensionless `.ts`/`.tsx`, explicit extension, then
  `index.ts`/`index.tsx`. Hit → solid `import` edge. Miss → `unresolvedImport`
  diagnostic (severity `warning`, no ghost edge in M1).
- **Non-relative** (package) specifier → external metadata: neither edge nor
  diagnostic.

**Edge id** = `${source}->${target}:import:${ordinal}`. Edges are sorted by
`(source, target)`; `ordinal` disambiguates repeated same-pair imports (0-based).
`kind = import`, `trigger = "import"`. `is_violation` starts `false` and is set
by the drift pass below. Dashed/soft edges (Phase 9) are still reserved on the
contract, not yet emitted.

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
   unresolved diagnostics, then `flag_drift` for facade-bypass violations.
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
