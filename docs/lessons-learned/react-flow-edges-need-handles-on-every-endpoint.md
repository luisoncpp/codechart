# React Flow drops edges whose endpoint node has no Handle (error #008)

**Context:** Phase 10 semantic zoom. At L0 `projectForZoom` re-routes module→module
edges onto the **collapsed group boxes** (group→group, aggregated). The reduction was
correct (the reduced graph carried `app → shared`, `main.ts → app`), yet the L0 overview
showed **no edges at all**.

**The trap:** React Flow won't render an edge unless **both** endpoint nodes expose a
connection `Handle`. A node with no `<Handle>` logs `[React Flow] Couldn't create edge …
handle id: "null" … error#008` and **silently drops the edge** — no element, no path.
`ModuleNodeView` had source/target handles, so L1 (module→module) edges rendered fine;
`GroupNodeView` had **none**, so the moment an edge endpoint became a group (only at L0),
it vanished. The data was right; the node was missing a handle.

**The fix:** give `GroupNodeView` the same invisible handles `ModuleNodeView` uses
(`type="source"`/`type="target"`, `opacity:0`, 1×1). `FloatingEdge` ignores their
position (it border-anchors from live geometry) — the handles exist purely so React Flow
will wire the edge.

**Counter-intuitive takeaway:** any node that *can* be an edge endpoint needs a Handle,
including container/group nodes you don't normally think of as connectable. If edges
disappear while the node set looks right, check the console for error #008 before
suspecting the projection.

**Also:** this only reproduced in the **browser preview** — jsdom doesn't render edges
(see [react-flow-jsdom-testing.md](./react-flow-jsdom-testing.md)). The regression test
asserts the *handles* exist on a group node (which jsdom does render), not the edge.
