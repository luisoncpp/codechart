# Flow — Analyze a project

End-to-end backend sequence that turns a folder of source into a `ProjectGraph`.

1. **Trigger** — CLI `analyze <dir>` (or, from Phase 7, the Tauri `analyze_project` command).
2. **Entry point** — `analysis::analyze_project(source, root)` (`src-tauri/src/analysis/mod.rs`).

## Step-by-step

| # | Step | Function | File |
|---|------|----------|------|
| 0 | Filesystem entry only: create Unreal defaults when needed | `ensure_unreal_defaults` | `tauri_api/mod.rs`, `unreal_config/mod.rs` |
| 1 | Read Unreal options + list files | `unreal_options_from_source`, `source.list_files()` | `unreal_config/mod.rs`, `project_source/fs_source.rs` |
| 2 | Discover + parse `*.group.md` → defs + configErrors | `discover_group_defs` | `project_config/mod.rs` |
| 3 | Filter ignored/generated files | `ignore_patterns_with_unreal`, `retain_unignored` | `project_config/ignore.rs` |
| 4 | Parse each adapter-supported, non-config file (partial results) | `parse_file` → `LanguageAdapter::parse` | `analysis/mod.rs`, `language_adapter/` |
| 5 | Assign modules → nested groups + facades | `resolve_groups` | `grouping/mod.rs` |
| 6 | Resolve imports → edges + unresolved diagnostics | `resolve_references_with_options` | `references/mod.rs`, `references/resolve.rs`, `references/cpp.rs` |
| 6b | Flag facade-bypass drift → `isViolation` + `architectureViolation` (Phase 8) | `flag_drift` (via `resolve_edges` + `group_boundaries`) | `analysis/mod.rs`, `references/drift.rs` |
| 6c | Pair event emit/listen tokens → `soft` (dashed) edges, appended (Phase 9) | `classify_soft` (via `resolve_edges`) | `analysis/mod.rs`, `references/soft.rs` |
| 6d | Pair Tauri `invoke("cmd")` with `#[tauri::command] fn cmd` → `soft` edges + `unresolvedIpc` diagnostics | `classify_tauri_ipc` (via `resolve_edges`) | `analysis/mod.rs`, `references/tauri_ipc.rs` |
| 6e | Pair interface importers with cross-group implementors → `soft` seam edges (Phase 10) | `classify_interface_seams` (via `resolve_edges`) | `analysis/mod.rs`, `references/interface_seams.rs` |
| 7 | Build `ModuleNode`s (id/label/lang/group/facade/loc/annotation) | `build_modules` | `analysis/nodes.rs` |
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
