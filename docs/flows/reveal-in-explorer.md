# Flow: module context-menu actions

1. **Trigger** — user right-clicks a module (or symbol) node on the canvas.
2. **Entry point** — `ReactFlow onNodeContextMenu` in `features/graph_canvas/Private/GraphCanvas.tsx`.
3. **Sequence**
   1. `GraphCanvasController.moduleForContextMenu(node)` — resolves the module id, graph-relative path, display color, and whether it is a deleted diff file (live module, else `diffOverlay.ghostModules`; symbols use their parent module).
   2. `ModuleContextMenu` opens at the cursor with **Open file preview**, **Open in editor**, **Copy relative path**, and **Reveal in file explorer**. On a deleted diff ghost (or any path in `deletedModuleIds`), editor and explorer items are disabled.
   3. **Open file preview** passes the resolved module id, color, and cursor position to `usePreviewFrames.openDocumentPreview`; it lazy-loads the source and opens the full L2 document composition in a frame. Deleted diff modules skip the live-file read and render reconstructed before-content as all-removed rows. The menu carries `data-preview-keep` and closes on a deferred tick so the click cannot fall through onto the canvas and dismiss the new preview.
   4. **Open in editor** joins `projectRoot` and `modulePath`, then calls `ShellClient.openInEditor(absolutePath, editor)` with the project setting.
   5. **Copy relative path** writes the graph-relative `modulePath` directly to `navigator.clipboard`.
   6. **Reveal in file explorer** joins `projectRoot` and `modulePath`, then calls `ShellClient.revealInExplorer(absolutePath)`.
   7. The Tauri implementation calls `openPath` or `revealItemInDir` from `@tauri-apps/plugin-opener`.
4. **Reads** — store `projectRoot`, reduced graph and diff ghost modules (module lookup), and lazy source cache for preview.
5. **Writes** — preview frame state for **Open file preview**; the copy action writes the relative path to the system clipboard.
6. **Side effects** — lazy source IPC for preview, launching the configured editor, clipboard write, or focusing the module file in the native explorer.
7. **Files** — `GraphCanvas.tsx`, `graph-canvas-controller.ts`, `ModuleContextMenu.tsx`, `preview_frames/`, `join-root-path.ts`, `ipc/shell-client`.
8. **Common failure modes** — no menu on group nodes; mock shell client is a
   no-op in jsdom tests; requires a loaded project (`projectRoot` set); the
   configured editor must be installed or point to an executable. Editor launch
   failures stay in the menu as an inline error. Tauri must grant
   `opener:allow-open-path` with a path/application scope that matches the call;
   `opener:default` alone rejects the command, while an unscoped command
   permission rejects the `(path, application)` pair.
