# Flow — Analyze a project

End-to-end backend sequence that turns a folder of source into a `ProjectGraph`.

1. **Trigger** — CLI `analyze <dir>` (or, from Phase 7, the Tauri `analyze_project` command).
   CI uses `check <dir>` instead: same pipeline with git metrics skipped; see [check-project.md](./check-project.md).
2. **Entry point** — `analysis::analyze_project` / `analyze_project_with_options`
   (`src-tauri/src/analysis/mod.rs`). Options include `metrics_window_days` and
   `hide_top_level_dot_dirs` (default true). Unreal `hidePlugins` comes from
   `.codechart/config.json` (default on), not from these session options.

## Step-by-step

| # | Step | Function | File |
|---|------|----------|------|
| 0 | Filesystem entry only: create Unreal defaults when needed; skip `Plugins/` dirs when hiding plugins | `ensure_unreal_defaults`, `analysis_fs_source` | `tauri_api/mod.rs`, `unreal_config/` |
| 1 | Read Unreal options + list files; optionally drop top-level `.*` dirs and `Plugins/` paths | `unreal_options_from_source`, `list_files`, `retain_without_top_level_dot_dirs`, `retain_without_plugins_dirs` | `unreal_config/mod.rs`, `project_source/fs_source.rs`, `project_config/ignore.rs` |
| 2 | Discover + parse `*.group.md` → defs + configErrors (from filtered paths) | `discover_group_defs_from` | `project_config/mod.rs` |
| 3 | Filter ignored/generated files | `ignore_patterns_with_unreal`, `retain_unignored` | `project_config/ignore.rs` |
| 4 | Parse each adapter-supported, non-config file (partial results) | `parse_file` → `LanguageAdapter::parse` | `analysis/mod.rs`, `language_adapter/` |
| 5 | Assign modules → nested groups + facades | `resolve_groups` | `grouping/mod.rs` |
| 6 | Resolve imports → edges + unresolved diagnostics | `resolve_references_with_options` | `references/mod.rs`, `references/resolve.rs`, `references/cpp.rs` |
| 6b | Flag facade-bypass drift → `isViolation` + `architectureViolation` (Phase 8) | `flag_drift` (via `resolve_edges` + `group_boundaries`) | `analysis/mod.rs`, `references/drift.rs` |
| 6c | Flag group layering (`mustNotImport` / `mayImport`) → `isViolation` + `architectureViolation:layer:…` | `flag_layering` (via `resolve_edges`) | `analysis/mod.rs`, `references/layering.rs` |
| 6d | Flag import cycles → `isViolation` + `circularDependency` | `flag_cycles` (via `resolve_edges`) | `analysis/mod.rs`, `references/cycles.rs` |
| 6e | Pair event emit/listen tokens → `soft` (dashed) edges, appended (Phase 9) | `classify_soft` (via `resolve_edges`) | `analysis/mod.rs`, `references/soft.rs` |
| 6f | Pair Tauri `invoke("cmd")` with `#[tauri::command] fn cmd` → `soft` edges + `unresolvedIpc` diagnostics | `classify_tauri_ipc` (via `resolve_edges`) | `analysis/mod.rs`, `references/tauri_ipc.rs` |
| 6g | Pair interface importers with cross-group implementors → `soft` seam edges (Phase 10) | `classify_interface_seams` (via `resolve_edges`) | `analysis/mod.rs`, `references/interface_seams.rs` |
| 7 | Build `ModuleNode`s (id/label/lang/group/facade/loc/annotation) | `build_modules` | `analysis/nodes.rs` |
| 7b | For Git repositories, enrich modules with activity/risk metrics from the requested lookback window (`metrics_window_days = 0` skips this and the git probe) | `enrich_module_metrics` | `git/metrics.rs`, `git/metrics_log.rs` |
| 8 | Merge + sort diagnostics | `merge` | `diagnostics/mod.rs` |
| 9 | Validate invariants + emit graph | `ProjectGraphBuilder::build` | `contract/builder.rs`, `contract/validate.rs` |

## Reads
- Disk (via `ProjectSource`): source files, `*.group.md`, and optional
  `.codechart/config.json`. No network.

## Writes / Side effects
- `analysis::analyze_project` stays pure over `ProjectSource`.
- Tauri filesystem analysis may write `.codechart/config.json` before analysis
  when an Unreal project has no config and include paths can be deduced.

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
