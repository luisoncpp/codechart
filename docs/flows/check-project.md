# Flow — Check a project (CI gate)

End-to-end CLI sequence that turns a folder into a compact diagnostic report and an exit code.

1. **Trigger** — `codechart-cli check <project-dir> [--fail-on=kind,...] [--format=json|text] [--quiet]` (CI job, local pre-commit, or manual). `codechart-cli help check` (or `check --help`) prints the flag reference without analyzing.
2. **Entry point** — `cli::run_check` (`src-tauri/src/cli/check/mod.rs`).

## Step-by-step

| # | Step | Function | File |
|---|------|----------|------|
| 1 | Parse path + flags (`--fail-on`, `--format`, `--quiet`) | `args::parse` | `cli/check/args.rs` (kind names via `cli/check/kinds.rs`) |
| 2 | Open the folder read-only (Unreal `Plugins/` skip from existing config / Unreal defaults in memory) | `analysis_fs_source` | `unreal_config/detect.rs` |
| 3 | Analyze with git metrics disabled | `analyze_project_with_options` (`metrics_window_days = 0`) | `analysis/mod.rs` |
| 4 | Same pipeline as [analyze-project](./analyze-project.md) steps 1–6, 8–9; **skip** step 7b (git enrich) | — | — |
| 5 | Decide fail from `--fail-on` (default architecture kinds) | `report_from_kinds` | `cli/check/report.rs` |
| 6 | Render text lines, compact JSON, or nothing (`--quiet`) | `render_stdout` | `cli/check/report.rs` |
| 7 | Exit 1 if any selected fail-on kind is present | `print_report` | `cli/check/mod.rs` |

Default fail-on kinds: `circularDependency`, `architectureViolation`, `configError`, `parseError`. The kind vocabulary (`DEFAULT_FAIL_ON`, `parse_kind`, `kind_name`) lives in `cli/check/kinds.rs`, imported by both `args.rs` and `report.rs` so the flag parser does not depend on the renderer. `--fail-on` replaces that set. Other kinds are printed (unless `--quiet`) and do not fail unless listed.

## Reads
- Disk via `ProjectSource`: source files, `*.group.md`, optional `.codechart/config.json`.
- No git history. No network.

## Writes / Side effects
- None. Does not persist `.codechart/config.json` (`ensure_unreal_defaults` is GUI-only).

## Common failure modes
- **Exit 1 with `architectureViolation`** — facade bypass (import of a private member) or group layering (`mustNotImport` / `mayImport`). Route through the facade, or drop the forbidden cross-group import.
- **Exit 1 with `circularDependency`** — solid import cycle. Works with inferred folders; no group files required.
- **Exit 0 with `unresolvedImport` lines** — expected default. Import resolution is deliberately not a gate (compilers do it better; `ignoredPaths` and out-of-root targets make unresolved normal). Pass `--fail-on=…,unresolvedImport` to opt in.
- **Exit 1 while `unresolvedImport` lines are printed** — the unresolved lines are not the cause; some other kind in the same output is. `--fail-on` *replaces* the default set, so opting unresolved in means re-listing every kind you still want gated.
- **`unknown diagnostic kind` / `unknown format`** — flag parse error on stderr; analysis is not run.
- **`analysis failed`** — `BuildError` (invariant). Same as `analyze`; not bad user input.
