# Tauri bundler scans `src/bin/` on disk — never put non-binary files there

**What applies to future work:** keep `*.group.md` (and any other non-Rust artifact) **out of**
`src-tauri/src/bin/`. Co-locate the group next to related code in a sibling folder (e.g.
`src/cli/cli.group.md`) and claim the binary with explicit `files` / `facades` paths such as
`../bin/codechart-cli.rs`.

**Why:** `tauri build` stage-2 binary discovery walks `src-tauri/src/bin/` from disk and treats
every entry as a bundle target, independent of whether Cargo compiled it. A file like
`cli.group.md` becomes `cli.group.exe` in the bundler's list; release then fails with "cannot
find the file" because nothing ever built that target.

**Grouping overlap:** `backend_shell` (`src-tauri/src/src.group.md`) folder-owns everything under
`src-tauri/src/`, including `bin/`. The Dev CLI group must claim `codechart-cli.rs` via explicit
`files`, and `backend_shell` must `exclude: bin/**` so the two groups do not overlap (overlap
leaves the module ungrouped and emits `configError`s).

**Do not "fix" an empty Dev CLI group by moving `cli.group.md` into `bin/`** — that restores
group membership in the graph but breaks `npm run dist:build`.
