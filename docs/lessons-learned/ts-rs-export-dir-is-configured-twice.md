# ts-rs export dir is configured in two places

The frontend contract types (`src/domain/graph/model/*.ts`) are **generated** by ts-rs
from `src-tauri/src/contract/types.rs` — they are not hand-written, despite living in
frontend `src/`.

Moving or renaming that folder requires updating `TS_RS_EXPORT_DIR` in **both**:

- `.cargo/config.toml` (`[env]` — what a plain `cargo test` uses)
- `package.json` `check` script (`cross-env TS_RS_EXPORT_DIR=…` — overrides the former)

If only one is updated, `cargo test` silently regenerates the bindings at the stale
location, resurrecting the old files next to the moved ones. Verify a move by running
`cargo test export_bindings` and checking `git status` for unexpected new `.ts` files.
