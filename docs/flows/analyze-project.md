# Flow — Analyze a project

End-to-end backend sequence that turns a folder of source into a `ProjectGraph`.

1. **Trigger** — CLI `analyze <dir>` (or, from Phase 7, the Tauri `analyze_project` command).
2. **Entry point** — `analysis::analyze_project(source, root)` (`src-tauri/src/analysis/mod.rs`).

## Step-by-step

| # | Step | Function | File |
|---|------|----------|------|
| 1 | List files | `source.list_files()` | `project_source/fs_source.rs` |
| 2 | Discover + parse `*.group.md` → defs + configErrors | `discover_group_defs` | `project_config/mod.rs` |
| 3 | Parse each adapter-supported, non-config file (partial results) | `parse_file` → `LanguageAdapter::parse` | `analysis/mod.rs`, `language_adapter/typescript/` |
| 4 | Assign modules → nested groups + facades | `resolve_groups` | `grouping/mod.rs` |
| 5 | Resolve relative imports → edges + unresolved diagnostics | `resolve_references` | `references/mod.rs`, `references/resolve.rs` |
| 5b | Flag facade-bypass drift → `isViolation` + `architectureViolation` (Phase 8) | `flag_drift` (via `resolve_edges` + `group_boundaries`) | `analysis/mod.rs`, `references/drift.rs` |
| 5c | Pair event emit/listen tokens → `soft` (dashed) edges, appended (Phase 9) | `classify_soft` (via `resolve_edges`) | `analysis/mod.rs`, `references/soft.rs` |
| 6 | Build `ModuleNode`s (id/label/lang/group/facade/loc/annotation) | `build_modules` | `analysis/nodes.rs` |
| 7 | Merge + sort diagnostics | `merge` | `diagnostics/mod.rs` |
| 8 | Validate invariants + emit graph | `ProjectGraphBuilder::build` | `contract/builder.rs`, `contract/validate.rs` |

## Reads
- Disk (via `ProjectSource`): all source files + `*.group.md`. No network.

## Writes / Side effects
- None. Pure transformation; the only output is the returned `ProjectGraph`
  (the CLI then serializes it to stdout).

## Partial-results discipline (D5)
- A file that fails to read/parse → `parseError` diagnostic, dropped from the
  graph; the rest still builds. A bad `*.group.md` → `configError`. A module
  claimed by two groups → `configError`, left unassigned.

## Common failure modes
- **Graph diverges from golden** → a determinism bug (sort order) or a resolver
  rule mismatch; diff `analyze` output against `tests/fixtures/golden/project-graph.json`.
- **`Err(BuildError)`** → an invariant broke (e.g. a facade outside its group, a
  dangling edge): a grouping/references bug, not bad input.
- **Missing edges** → specifier was non-relative (treated as external) or resolved
  to a path not in the parsed set.
