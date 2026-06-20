# The `analyze_project` command uses the picked path as the graph `root`

`tauri_api::analyze_project(path)` passes its single `path` argument to **both**
`FsProjectSource::new(path)` (the filesystem root it scans) and
`analyze_project(source, root)` (the value stamped onto `ProjectGraph.root`).

Consequence for tests: the golden fixture records a **repo-relative** root
(`tests/fixtures/ts-basic-project`), but the command run against the same folder
records whatever path it was handed (an absolute path in tests). So an end-to-end
diff against the golden must patch `expected.root` to the path passed in — every
other field matches byte-for-byte. See `src-tauri/src/tauri_api/tests.rs`.

Why it matters: module **ids are repo-relative POSIX paths** (from
`FsProjectSource`), independent of the root, so they stay stable regardless of
where the project lives. Only `root` is absolute/caller-defined. Don't "fix" this
by deriving ids from the absolute path — that would break the golden contract.
