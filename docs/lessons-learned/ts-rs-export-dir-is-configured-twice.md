# ts-rs export dir is configured in two places

The frontend contract types (`src/domain/graph/model/*.ts`) are **generated** by ts-rs
from `src-tauri/src/contract/types.rs` — they are not hand-written, despite living in
frontend `src/`.

Moving or renaming that folder requires updating `TS_RS_EXPORT_DIR` in **both**:

- `.cargo/config.toml` (`[env]` — what a plain `cargo test` uses)
- `package.json` `check:rust` script (`cross-env TS_RS_EXPORT_DIR=…` — overrides the
  former; it is the `cargo test` leg of `npm run check`, split out of it)

If only one is updated, `cargo test` silently regenerates the bindings at the stale
location, resurrecting the old files next to the moved ones. Verify a move by running
`cargo test export_bindings` and checking `git status` for unexpected new `.ts` files.

## The two values are written differently on purpose

The two settings use **different bases**, so the strings must differ:

| Where | Value | Resolved from |
|-------|-------|---------------|
| `.cargo/config.toml` | `src/domain/graph/model`, `relative = true` | the parent of `.cargo/` = **repo root** |
| `check:rust` | `../src/domain/graph/model` | the process cwd = `src-tauri/` (ts-rs uses the env value as-is) |

`.cargo/` lives at the repo root, not in `src-tauri/`. Copying the `../` form into the
config (as happened June–October 2026) makes every plain `cargo test` write the bindings
**outside the repo**, to `<parent-of-repo>/src/domain/graph/model`. `git status` can't
see that, so the check above misses it — look for a new `src/` next to the repo folder.
