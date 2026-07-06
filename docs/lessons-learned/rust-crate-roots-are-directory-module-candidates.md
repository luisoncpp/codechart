# Rust crate roots are directory module candidates

Rust paths such as `crate::Thing` and `crate::{function, Type}` can map to
re-exports in `src/lib.rs` or `src/main.rs`. Resolving only `<base>/mod.rs`
misclassifies valid crate-root imports as missing files.

For a directory-shaped Rust target, try nested-module `mod.rs` first, then
crate-root `lib.rs` and `main.rs`. Preserve item fallback so paths ending in
functions or constants can walk back to the owning root module.
