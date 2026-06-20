# Testing React Flow under jsdom

React Flow (`@xyflow/react` v12) assumes real browser APIs. Three things bite in vitest + jsdom:

1. **Polyfills are mandatory or the canvas throws on mount.** `tests/setup.ts` must define
   `ResizeObserver`, `DOMMatrixReadOnly`/`DOMMatrix`, non-zero `HTMLElement.offset{Width,Height}`,
   and `SVGElement.getBBox`. Without these, rendering `<ReactFlow>` errors before any assertion runs.

2. **Edges do not render in jsdom.** Edge paths are computed only after source/target **handle
   positions are measured**, which never happens without layout. `.react-flow__edge` elements stay at
   count 0. → Assert **edge counts at the projection level** (`projectGraph` output), not the DOM.
   Nodes *do* render (count them via `.react-flow__node`).

3. **`userEvent.click` on a node throws**, not `fireEvent.click`. `userEvent` issues a full pointer
   sequence; the mousedown reaches d3-zoom/d3-drag, whose `nodrag.js` reads `event.view.document` —
   `event.view` is `null` in jsdom → `TypeError`. `fireEvent.click(node)` dispatches a bare click that
   still triggers `onNodeClick`, so use it for selection tests.

Takeaway: test the **pure projection** for graph shape (counts, nesting, relative positions); use the
DOM render only to confirm nodes mount and clicks wire to the store.
