# Dev CLI (`codechart-cli`)

**Status: implemented.** Source: `src-tauri/src/bin/codechart-cli.rs`, `src-tauri/src/cli/`.

Headless entry to the analysis pipeline. `analyze` dumps the full `ProjectGraph`; `check` is the CI quality gate.

```bash
cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- <parse|groups|analyze|check|help|version> [path]
```

| Subcommand | Output | Exit |
|------------|--------|------|
| `parse <file>` | adapter imports / symbols / annotations | 0 on success |
| `groups <dir>` | resolved group tree | 0 on success |
| `analyze <dir>` | pretty `ProjectGraph` JSON (debug dump) | 0 when analysis succeeds |
| `check <dir>` | diagnostics only; no graph | **non-zero** when a fail-on kind is present |
| `help [command]` | usage for the CLI or one command | 0 (`--help` / `-h` are aliases) |
| `version` | `codechart-cli <CARGO_PKG_VERSION>` | 0 (`--version` / `-V` are aliases) |

`groups`, `analyze`, and `check` all honor `.codechart/config.json`
`ignoredPaths` — the same project-scoped ignored directories the app's Settings ▾
**Ignored directories...** modal edits. There is no flag: one source of truth
means a CI gate sees exactly what the user sees on the canvas. (`groups`
previously used a bare `FsProjectSource` and so ignored the Unreal
generated/plugin filters too; it now shares `analyze`'s file set.)

The version string comes from `src-tauri/Cargo.toml`'s `package.version` at compile time. CLI-only GitHub releases use the deploy date as that version (`YYYY.M.D`, no leading zeros — Cargo semver). That is independent of the desktop installer version in `tauri.conf.json`. No args prints the same root help as `help`. `codechart-cli help check` (or `check --help`) lists `check` flags and `DiagnosticKind` names.

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
  - **Why they are never a default failure:** compilers/type checkers resolve imports better, and an unresolved target is expected here — `ignoredPaths` can exclude files on purpose, and the target may be external to the analysis root (npm packages, C++ dependency headers). Treat an unresolved finding as information, not a gate. If `check` exits 1 while printing `unresolvedImport` lines, another kind in the same output caused it — read the first token of each line.
  - `parseError` stays in the default set because it is **not** an import finding: it means a file in the analyzed set could not be read/parsed at all (malformed source alone never yields one — see `tree-sitter-error-tolerant-no-parse-error`), so the graph is silently incomplete.
- Flags may appear before or after `<dir>`.
- Uses `AnalyzeOptions.metrics_window_days = 0`, which skips the git probe — no churn / bug-risk, no git history required in CI.
- Uses `analysis_fs_source` + `analyze_project_with_options`. Does **not** call `ensure_unreal_defaults`; deduced Unreal options stay in-memory.

SARIF / GitHub annotations stay out of scope: findings are module/edge scoped, not line-scoped.

### Wired into `npm run check`

`check` gates this repo against itself: `npm run check:arch`
(`cd src-tauri && cargo run --quiet --bin codechart-cli -- check ..`) is the last leg of
`npm run check`, after `check:rust`. The analysis root is the repo root, so the gate sees
`src/` and `src-tauri/` together — run it from the repo root via npm, not from `src-tauri`
with `check .`, which would analyze only the Rust crate.

It runs with the default fail-on set and no `--quiet`, so a failure prints the offending
diagnostics before exiting 1. This became viable only once the repo reached zero
diagnostics; keep it there, since the gate has no baseline or allowlist.

Treat `check` as an **architecture gate**, not a compiler. Cycles work with no `*.group.md`. Facade bypass needs explicit group `facades` — inferred folder groups are public. Group layering needs `mustNotImport` / `mayImport` on `*.group.md`.

## Why not `analyze | jq .diagnostics`

Unreal `Source/` graphs are huge; git metrics run whenever the folder is a repo; there is no fail-on or compact report. `check` is a separate I/O contract, not a wrapper.
