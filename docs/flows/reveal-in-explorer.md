# Flow: module context-menu actions

1. **Trigger** — user right-clicks a module (or symbol) node on the canvas.
2. **Entry point** — `ReactFlow onNodeContextMenu` in `features/graph_canvas/Private/GraphCanvas.tsx`.
3. **Sequence**
   1. `GraphCanvasController.moduleForContextMenu(node)` — resolves the module id, graph-relative path, and display color (symbols use their parent module).
   2. `ModuleContextMenu` opens at the cursor with **Open file preview**, **Copy relative path**, and **Reveal in file explorer**.
   3. **Open file preview** passes the resolved module id, color, and cursor position to `usePreviewFrames.openDocumentPreview`; it lazy-loads the source and opens the full L2 document composition in a frame.
   4. **Copy relative path** writes the graph-relative `modulePath` directly to `navigator.clipboard`.
   5. **Reveal in file explorer** joins `projectRoot` and `modulePath`, then calls `ShellClient.revealInExplorer(absolutePath)`.
   6. Tauri implementation calls `revealItemInDir` from `@tauri-apps/plugin-opener` (already registered in `lib.rs`).
4. **Reads** — store `projectRoot`, reduced graph (module lookup), and lazy source cache for preview.
5. **Writes** — preview frame state for **Open file preview**; the copy action writes the relative path to the system clipboard.
6. **Side effects** — lazy source IPC for preview, clipboard write, or focusing the module file in the native explorer.
7. **Files** — `GraphCanvas.tsx`, `graph-canvas-controller.ts`, `ModuleContextMenu.tsx`, `preview_frames/`, `join-root-path.ts`, `ipc/shell-client`.
8. **Common failure modes** — no menu on group nodes; mock shell client is a no-op in jsdom tests; requires a loaded project (`projectRoot` set).
