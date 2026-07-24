# Shell client

Thin frontend seam for OS shell actions used by the graph canvas context menu.

## API

| Method | Role |
|--------|------|
| `openInEditor(absolutePath, editor)` | Open a module file with the configured editor executable (`openPath` via `@tauri-apps/plugin-opener`) |
| `revealInExplorer(absolutePath)` | Focus the file in the native explorer (`revealItemInDir` via `@tauri-apps/plugin-opener`) |

## Implementations

| File | When |
|------|------|
| `ipc/shell-client/Private/tauri-shell-client.ts` | Desktop (`npm run tauri dev`) |
| `ipc/shell-client/Private/mock-shell-client.ts` | jsdom tests / web-only dev |

The plugin is registered in `src-tauri/src/lib.rs`. The desktop capability must
include both `opener:default` (reveal) and a scoped
`opener:allow-open-path` permission (launch a configured application);
`opener:default` does not include path opening. The scope allows `**/*` paths
with `app: true` because both the project root and per-project editor are chosen
at runtime. Both operations stay in the frontend shell seam, so no Rust command
is needed.

## Flow

See [reveal-in-explorer.md](../flows/reveal-in-explorer.md).
