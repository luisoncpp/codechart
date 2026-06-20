# `create-tauri-app -f` deletes untracked files in the target directory

When scaffolding a Tauri app into an existing project directory, `create-tauri-app` with the `-f` / `--force` flag does not merely overwrite conflicting files — it removes untracked files and folders that are not part of the generated template.

In this project that removed `sample-img/`, `.agents/`, and `.claude/` (which were not yet committed to git). The tracked `docs/`, `AGENTS.md`, and `CLAUDE.md` were restored from git, but the untracked directories were lost.

## Takeaway

Before running any scaffolding tool with a force flag, commit or back up the existing directory. Prefer scaffolding into a temporary location and moving artifacts in, rather than forcing the tool to write directly into a populated project root.
