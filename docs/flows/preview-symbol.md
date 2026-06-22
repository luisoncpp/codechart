# Flow: preview a symbol's definition next to it

1. **Trigger** — user clicks an exported symbol node in L1.5 semantic zoom view.
2. **Entry point** — `ReactFlow onNodeClick` in `features/graph_canvas/Private/GraphCanvas.tsx`.
3. **Sequence**
   1. `GraphCanvasController.onNodeClick(node, event)` intercept is triggered.
   2. Controller selects the parent module in the store: `store.select(parentId)` (rendering selected outline on the module).
   3. Controller invokes the custom `onSymbolClick` callback, passing the clicked symbol node and mouse event.
   4. `GraphCanvas.handleSymbolClick` runs:
      1. Finds the clicked symbol's DOM element using `.closest()`.
      2. Lazily fetches the module source code: `store.fetchModuleSource(moduleId)`.
      3. Computes the position for the widget: `computeWidgetPosition(symbolRect, containerRect)` placing it next to the symbol node (adjusts to the left if it overflows the right side).
      4. Sets the `activeSymbol` local state.
   5. `SymbolSourceWidget` renders absolute-positioned on the canvas:
      1. Parses the source text to locate the line where the symbol is defined using `findSymbolLine` (checks for interface, class, function, const, etc.).
      2. Highlights the definition line.
      3. Automatically scrolls the highlighted definition line into center focus.
   6. Click outside listeners check if any click is outside `.symbol-widget` and clear `activeSymbol`.
   7. Moving or zooming the canvas (`onMoveStart`) clears `activeSymbol`.
4. **Reads** — store `graph`, parent `moduleId`, module `path`, source cache.
5. **Writes** — store `selectedId`, local `activeSymbol` state.
6. **Side effects** — lazy load file contents if not already in cache (calls IPC `readModuleSource`).
7. **Files** — `GraphCanvas.tsx`, `SymbolSourceWidget.tsx`, `graph-canvas-controller.ts`, `graph-session-store.ts`.
8. **Common failure modes** — zooming out below L1.5 hides symbol nodes, which automatically closes/hides the widget; moving the viewport closes the widget.
