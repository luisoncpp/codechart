# Flow: reveal module in file explorer

1. **Trigger** — user right-clicks a module (or symbol) node on the canvas.
2. **Entry point** — `ReactFlow onNodeContextMenu` in `features/graph_canvas/Private/GraphCanvas.tsx`.
3. **Sequence**
   1. `GraphCanvasController.modulePathForContextMenu(node)` — resolves the module's graph-relative path (symbols use their parent module).
   2. `ModuleContextMenu` opens at the cursor with **Reveal in file explorer**.
   3. User picks the item → `joinRootPath(projectRoot, modulePath)` → `ShellClient.revealInExplorer(absolutePath)`.
   4. Tauri implementation calls `revealItemInDir` from `@tauri-apps/plugin-opener` (already registered in `lib.rs`).
4. **Reads** — store `projectRoot`, reduced graph (module path lookup).
5. **Writes** — none (pure UI + OS shell side effect).
6. **Side effects** — native file explorer focuses the module file.
7. **Files** — `GraphCanvas.tsx`, `graph-canvas-controller.ts`, `ModuleContextMenu.tsx`, `join-root-path.ts`, `ipc/shell-client`.
8. **Common failure modes** — no menu on group nodes; mock shell client is a no-op in jsdom tests; requires a loaded project (`projectRoot` set).
