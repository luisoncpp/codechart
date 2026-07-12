# The L0 layout still contains every hidden module box

## Lesson

At L0 the layout is computed from the **full** graph — collapse is projection-only
(`scroll-zoom` re-layout feedback lesson). That means `LayoutedGraph.modules` contains a box for
every module *inside* a collapsed group, even though the canvas never draws them.

Any geometry derived from "a group's child boxes" (e.g. `minChildY`/`minChildX` used to keep the
collapsed card's description clear of children) **must filter to visible children first**. Consuming
the raw child-box list clamps against ghosts: a collapsed card's description got squeezed above its
own invisible topmost module — rendering `null` or a one-line ellipsis in a visibly empty card.

## Rule of thumb

- Subgroup boxes are always visible (nested groups are never absorbed at L0).
- Module boxes are visible only when their group is expanded.
- `descriptionBoxGeometry` (L1 expanded path) is the counter-example: there the modules *are*
  visible, so it correctly uses all child boxes. Visibility depends on the consumer's level.

See `visibleChildBoxes` in `src/domain/graph/Private/rf-projection-nodes.ts`.
