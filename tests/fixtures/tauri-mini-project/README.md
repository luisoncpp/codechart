# Reference fixture: `tauri-mini-project`

A minimal Tauri layout (TypeScript frontend + Rust backend) used to exercise
IPC seam detection. Its hand-authored expected analysis lives in
[`../golden/tauri-mini-project-graph.json`](../golden/tauri-mini-project-graph.json).

## Structure

One group declared by `app.group.md` at the project root:

- **app** — owns the whole fixture: frontend `src/` and backend `src-tauri/src/`.

## Deliberately planted facts

| Seed | Location | Surfaces in |
|------|----------|-------------|
| IPC seam | `src/ipc/client.ts` `invoke("greet")` ↔ `commands.rs` `#[tauri::command] fn greet` | `soft` edge, `trigger: "ipc:greet"` |
| Orphan invoke | `src/ipc/orphan.ts` `invoke("missing_cmd")` with no handler | `unresolvedIpc` diagnostic |
| Import chain | `app.ts → client.ts`, `lib.rs → commands.rs` | `import` edges |

## Golden scope

The golden output reflects what the analyzer is expected to produce:

- **Import edges** for resolved relative imports in TS and Rust.
- **One IPC soft edge** pairing frontend invoke with backend command.
- **One `unresolvedIpc` diagnostic** for the orphan invoke; no edge is emitted.
