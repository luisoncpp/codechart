# Flow: preview a symbol's definition next to it (multi-frame)

1. **Trigger** — user clicks an exported symbol node in L1.5 semantic zoom view, or clicks an imported symbol inside an already-open preview frame.
2. **Entry point** — `ReactFlow onNodeClick` in `features/graph_canvas/Private/GraphCanvas.tsx` (symbol node), or the frame body click handler in `preview_frames/SymbolSourceWidget.tsx` (imported symbol).
3. **Sequence**
   1. All preview-frame state lives in the nested deep module `features/graph_canvas/Private/preview_frames/` (`usePreviewFrames` hook; `GraphCanvas` only renders `framesView` and forwards `openFromSymbolNode` / `closeAll`).
   2. **Symbol node click:** `GraphCanvasController.onNodeClick` selects the parent module and invokes `openFromSymbolNode`, which closes any open frames (a canvas click is outside all frames), fetches the module source (`store.fetchModuleSource`), positions the frame next to the symbol (`computeWidgetPosition`), and appends one `PreviewFrame`.
   3. **Imported symbol click inside a frame:** `DiffCodeLines` tags identifiers that match `importedSymbolTargets(graph, moduleId)` (symbols exported by modules the frame's module imports) with `hl-clickable`. Clicking one runs `openFromImport`:
      1. Resolves the name to its defining module via the import edges (first exporter wins).
      2. Fetches that module's source.
      3. Places the new frame via `placeAdjacentFrame`: **right** of the clicked frame, else **below**, else **above** (a spot is invalid if it overlaps any live frame rect or overflows the canvas container); if all fail, opens at the **right anyway (overlapping)**. Live rects come from the DOM (`[data-frame-id]`), so user resizes/drags are honored.
      4. If a frame for the same module + symbol is already open, it is brought to front instead of duplicated (`openFrame` dedupe).
   4. Each `SymbolSourceWidget` scrolls its own body to center the definition line (`findSymbolLine` + manual `scrollTop` — **not** `scrollIntoView`, which would scroll the window).
   5. **Drag:** pointerdown on the header bar starts `startFrameDrag` (window-level pointermove → `moveFrame`); the click that trails a real drag is swallowed in capture phase so it can't close the frames.
   6. **Z-order:** pointerdown anywhere in a frame brings it to front (`bringToFront`).
   7. **Close rules:** a document-level click landing outside every `.symbol-widget` closes **all** frames; clicks inside any frame (including scrollbars) close nothing; each frame's ✕ closes just that frame; canvas pan/zoom (`onMoveStart`) closes all.
4. **Reads** — store `graph` (modules, import edges, `exportedSymbols`), source cache, live frame DOM rects.
5. **Writes** — store `selectedId` (symbol-node path only), `frames` state inside `usePreviewFrames`.
6. **Side effects** — lazy load file contents per opened module (IPC `read_module_source`).
7. **Files** — `preview_frames/{index.ts, use-preview-frames.tsx, SymbolSourceWidget.tsx, frame-list.ts, frame-placement.ts, imported-symbol-resolver.ts, frame-drag.ts, symbol-source-utils.ts}`, `GraphCanvas.tsx`, `DiffCodeLines.tsx`.
8. **Common failure modes** — zooming below L1.5 hides symbol nodes and any viewport move closes all frames; an identifier is only clickable if some import edge of the frame's module targets a module exporting that exact name (soft edges don't count); placement falls back to overlapping-right in cramped viewports by design.
