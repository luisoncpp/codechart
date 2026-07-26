# L0 collapses the whole ancestor chain, so a per-group expand must walk it

At L0 the store seeds `collapsedGroupIds = allGroupIds(graph)` — **every** group, including parents.
So a per-group override that only deletes its own id is a no-op for anything nested: the group's
modules are still hidden by `isModuleExpanded` (which walks up to the nearest collapsed ancestor),
while `GroupNodeView` does flip from `CollapsedCard` to `ExpandedHeader`. The visible result is
"the title font got smaller and nothing else happened" — which reads as a font bug, not a collapse
bug. Any action that makes a group's contents visible must expand the ancestor chain, the same way
`focusOn` does for a module (`expandCollapsedAncestors` / `expandCollapsedGroupAncestors`).

Corollary worth remembering: **the layout reduction is not the display reduction.** At L0 the layout
graph is deliberately the *full* graph (collapse is projection-only), so publishing it as
`getReducedGraph()` at the end of a re-layout silently un-aggregates L0's group→group edges. Keep
`reduceForLayout` (layout engine) and `reduceForView` (display) on separate paths; they only coincide
at L1+.
