# React Flow viewport culling is inert under jsdom

`onlyRenderVisibleElements` (@xyflow/react 12) culls via `getNodesInside`, which
**force-renders any node whose `internals.handleBounds` is unset** — an unmeasured
node is never culled. Nodes only get measured by the per-node `ResizeObserver`,
and our jsdom setup stubs `ResizeObserver` as a no-op (`tests/setup.ts`), so under
jsdom no node is ever measured and **every node renders even with culling on**.

Consequences:

- Existing DOM node-count assertions (`.react-flow__node` = groups + modules)
  keep passing unchanged after enabling the flag.
- Culling behavior itself **cannot be asserted in jsdom**. Guard it by asserting
  the prop is passed (`tests/graph-canvas-culling.test.tsx` records `ReactFlow`
  props via a partial `vi.mock`) plus a node-count test in the same file that
  pins the force-render behavior — a React Flow upgrade that changes
  `forceInitialRender` fails there loudly instead of scattering failures.
- In a real browser, measurement persists in `nodeLookup` after a culled node
  unmounts, so nodes scrolling back in do not re-measure or flash; the store's
  `nodes`/`nodeLookup`/`nodesInitialized` are never filtered by culling, so
  anything reading store geometry (e.g. a custom edge layer) is unaffected.
