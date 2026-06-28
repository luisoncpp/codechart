# Shell client

Thin frontend seam for OS shell actions. Currently exposes one operation used by the graph canvas context menu.

## API

| Method | Role |
|--------|------|
| `revealInExplorer(absolutePath)` | Focus the file in the native explorer (`revealItemInDir` via `@tauri-apps/plugin-opener`) |

## Implementations

| File | When |
|------|------|
| `ipc/shell-client/Private/tauri-shell-client.ts` | Desktop (`npm run tauri dev`) |
| `ipc/shell-client/Private/mock-shell-client.ts` | jsdom tests / web-only dev |

The plugin is already registered in `src-tauri/src/lib.rs` with `opener:default` capability — no new Rust command.

## Flow

See [reveal-in-explorer.md](../flows/reveal-in-explorer.md).
