# Cargo never prunes `target/`, and `cargo sweep --file` deletes everything

- **Cargo keeps every build output it ever made.** A dependency bump or a profile change adds a new hashed copy and leaves the old one. `src-tauri/target` reached 4.1 GB with four `tauri_utils` rlibs and two `webview2-com-sys` build dirs. `cargo clean` only resets it until the next build.
- **`cargo sweep --file` (stamp mode, "remove what the last build didn't use") is wrong here.** Cargo does not touch the mtime of artifacts it reuses. After a fresh `cargo test --no-run` that rebuilt nothing, `--file` still wanted to clean 4.05 GiB, which is the whole folder.
- **Use `cargo sweep --maxsize <N>`.** It evicts the oldest-mtime files first. mtime is the build time, not the last use, so a dependency built long ago but still in use can be evicted and recompiled. Keep the cap above the working set.
- **Measured working sets:** dev and test share about 1.7 GB of dependency artifacts (a `cargo build` after `cargo test` recompiled only `codechart`, 20 s). Release is a separate set of about 1.3 GB. Capping release together with dev makes the two evict each other, so release intermediates are deleted after packaging instead (`target/release/bundle` is kept).
- Enforced by `scripts/clean-target.mjs`, run from npm `post*` hooks (`postcheck:rust`, `posttauri`, `postdist:win`). `cargo-sweep` must be installed once (`cargo install cargo-sweep`); the hook warns and continues if it is missing.

**Why:** `target/` is not self-limiting, and the obvious tools either delete too little (`cargo clean` is undone by the next build) or too much (stamp mode).

**How to apply:** Do not reach for `cargo sweep --file` or `cargo clean` as a size fix. Change the cap in `scripts/clean-target.mjs` if rebuilds get slow, and raise it above the dev+test working set (about 1.7 GB) rather than lowering it.
