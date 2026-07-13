# Flow: module context-menu actions

1. **Trigger** — user right-clicks a module (or symbol) node on the canvas.
2. **Entry point** — `ReactFlow onNodeContextMenu` in `features/graph_canvas/Private/GraphCanvas.tsx`.
3. **Sequence**
   1. `GraphCanvasController.modulePathForContextMenu(node)` — resolves the module's graph-relative path (symbols use their parent module).
   2. `ModuleContextMenu` opens at the cursor with **Copy relative path** and **Reveal in file explorer**.
   3. **Copy relative path** writes the graph-relative `modulePath` directly to `navigator.clipboard`.
   4. **Reveal in file explorer** joins `projectRoot` and `modulePath`, then calls `ShellClient.revealInExplorer(absolutePath)`.
   5. Tauri implementation calls `revealItemInDir` from `@tauri-apps/plugin-opener` (already registered in `lib.rs`).
4. **Reads** — store `projectRoot`, reduced graph (module path lookup).
5. **Writes** — no application state; the copy action writes the relative path to the system clipboard.
6. **Side effects** — the selected action writes to the clipboard or focuses the module file in the native explorer.
7. **Files** — `GraphCanvas.tsx`, `graph-canvas-controller.ts`, `ModuleContextMenu.tsx`, `join-root-path.ts`, `ipc/shell-client`.
8. **Common failure modes** — no menu on group nodes; mock shell client is a no-op in jsdom tests; requires a loaded project (`projectRoot` set).
