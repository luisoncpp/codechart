# Pinning a disconnected node to a group's top-left in ELK `layered`

To reserve space for non-edge content inside a group (e.g. a group's in-body
description box) and have ELK pack the real modules **around** it, inject it as a
real leaf child instead of using padding. But placing it predictably at the
**top-left corner** needs three options together — any one alone is insufficient:

- `elk.layered.layering.layerConstraint: "FIRST"` on the node → leftmost column.
- `elk.layered.considerModelOrder.strategy: "NODES_AND_EDGES"` on the group → the
  *first* child (prepend it) sorts to the **top** within that column.
- `elk.separateConnectedComponents: "false"` on the group → **the crucial one.** A
  node with no edges is its own connected component; by default ELK lays each
  component out independently and the component packer **ignores model order**, so
  an all-disconnected group (every module edgeless, like a types-only group) drops
  the description to the bottom. Disabling separation keeps everything in one flow
  where model order applies.

Counter-intuitive part: `considerModelOrder` looks like it should be enough, but it
only orders *within* a connected component. The fix for the edgeless-group case is
the unrelated-sounding `separateConnectedComponents=false`.

Trade-off: disabling component separation makes a group of fully-disconnected leaf
modules stack into one column (taller) **when that group uses `layered`**. Groups
with no intra-group import edges now use `rectpacking` instead (see
`hasIntraGroupEdges` in `elk-input.ts`), so the pin options above apply only where
dependency flow layout is active.

A group-of-groups (the root `app` wrapper) still resists exact top-left pinning —
`layerConstraint` is honored loosely when children are large compound nodes. Treated
as acceptable since the wrapper's description is rarely the focus.
