# Dev CLI (`codechart-cli`)

**Status: implemented.** Source: `src-tauri/src/bin/codechart-cli.rs`, `src-tauri/src/cli/`.

Headless entry to the analysis pipeline. `analyze` dumps the full `ProjectGraph`; `check` is the CI quality gate.

```bash
cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- <parse|groups|analyze|check|help> [path]
```

| Subcommand | Output | Exit |
|------------|--------|------|
| `parse <file>` | adapter imports / symbols / annotations | 0 on success |
| `groups <dir>` | resolved group tree | 0 on success |
| `analyze <dir>` | pretty `ProjectGraph` JSON (debug dump) | 0 when analysis succeeds |
| `check <dir>` | diagnostics only; no graph | **non-zero** when a fail-on kind is present |
| `help [command]` | usage for the CLI or one command | 0 (`--help` / `-h` are aliases) |

No args prints the same root help as `help`. `codechart-cli help check` (or `check --help`) lists `check` flags and `DiagnosticKind` names.

## `check`

CI lint-style gate over the same `Diagnostic` list `analyze` already produces.

```bash
codechart-cli check <dir> [--fail-on=kind,...] [--format=json|text] [--quiet]
```

- Prints **only** diagnostics. `--format=text` (default): `kind  moduleId  message` (moduleId is `-` when absent); empty list → no stdout. `--format=json`: compact JSON array of `Diagnostic` objects (`[]` when empty).
- `--quiet` prints nothing; the exit code is still the gate.
- `--fail-on=kind,…` **replaces** the default fail set. Kinds are the camelCase `DiagnosticKind` names. `--fail-on=a,b` and `--fail-on a,b` are both accepted. Last `--fail-on` wins.
- Default fail-on: `circularDependency`, `architectureViolation`, `configError`, `parseError`.
- `unresolvedImport` / `unresolvedIpc` / `unresolvedUnityAsset` print but do not fail unless listed. Opt-in example: `--fail-on=circularDependency,architectureViolation,configError,parseError,unresolvedImport`.
- Flags may appear before or after `<dir>`.
- Uses `AnalyzeOptions.metrics_window_days = 0`, which skips the git probe — no churn / bug-risk, no git history required in CI.
- Uses `analysis_fs_source` + `analyze_project_with_options`. Does **not** call `ensure_unreal_defaults`; deduced Unreal options stay in-memory.

SARIF / GitHub annotations stay out of scope: findings are module/edge scoped, not line-scoped.

Treat `check` as an **architecture gate**, not a compiler. Cycles work with no `*.group.md`. Facade bypass needs explicit group `facades` — inferred folder groups are public.

## Why not `analyze | jq .diagnostics`

Unreal `Source/` graphs are huge; git metrics run whenever the folder is a repo; there is no fail-on or compact report. `check` is a separate I/O contract, not a wrapper.
