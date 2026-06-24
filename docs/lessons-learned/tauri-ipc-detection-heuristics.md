# Tauri IPC detection heuristics

**What's counter-intuitive:** tree-sitter-rust does **not** nest `#[tauri::command]`
on `function_item` — outer attributes are separate `_declaration_statement`
siblings that must be paired with the **next** `function_item` in
`source_file` / `declaration_list` order. Scanning only `function_item` children
finds nothing.

**TypeScript invoke guard:** record `invoke("…")` only when the module imports
from `@tauri-apps/api` (covers `@tauri-apps/api/core`). Without that import,
bare `invoke()` calls are ignored so non-Tauri projects stay clean.

**Same gates as event soft edges:** the first argument must be a **string
literal** (dynamic command names produce nothing). Cross-module pairing is
TS caller → Rust handler by command name.

**MVP limits worth preserving when extending:**
- Rust fn name must equal the IPC command name (`#[tauri::command(rename = …)]`
  not parsed).
- `generate_handler![…]` not parsed — only annotated fns count.
- IPC wrapped behind a client module shows one seam at the client file, not at
  every caller (by design).

**Pipeline placement:** `classify_tauri_ipc` is a post-pass over parsed modules,
wired in `analysis::resolve_edges` alongside `classify_soft` and
`classify_interface_seams`. Orphan invokes → `unresolvedIpc` diagnostic, no edge.

Fixture: `tests/fixtures/tauri-mini-project/`.
