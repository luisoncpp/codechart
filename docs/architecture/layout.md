# Layout (`domain/layout`)

Frontend seam that turns a coordinate-free `ProjectGraph` into positioned boxes.
ELK is an implementation detail kept private behind `index.ts`.

## Public interface (`domain/layout/index.ts`)

- `interface LayoutEngine { layout(graph: ProjectGraph): Promise<LayoutedGraph> }`
- `class ElkLayoutEngine` — the only implementation.
- `LayoutedGraph` / `LayoutBox` data types.

```ts
LayoutBox  = { id, parentId, x, y, width, height }   // absolute top-left
LayoutedGraph = { groups, modules, symbols, descriptions: LayoutBox[], width, height }
```

Coordinates are **absolute** (not ELK's parent-relative). Phase 6 (React Flow) can derive
parent-relative offsets by subtracting the parent box when it needs `parentNode` children.

## Pipeline (private)

1. `elk-input.ts` `buildElkGraph` — `ProjectGraph` → hierarchical `ElkNode`:
   - Groups become compound nodes nested by `parentId`; modules become leaf nodes under their
     `groupId` (ungrouped nodes sit at the root). Children are **sorted by id** for determinism.
   - Leaf size + spacing/padding come from `PRESETS` (deterministic; no randomness). The group's
     **top** padding is `groupPadding + groupHeaderHeight` so the rendered header (graph-canvas) has
     reserved room and modules never overlap the group label.
   - **In-body description box:** an **annotated** group gets a real leaf child (`descriptionBoxId`)
     injected into its layered flow, sized by `descriptionBoxSize(short, long)` (content-fit, like
     `moduleBoxSize`), pinned top-left (`layerConstraint: FIRST` + `considerModelOrder`;
     `separateConnectedComponents=false` so all-disconnected groups still honor model order). ELK packs
     the modules around it. These boxes are returned separately as `LayoutedGraph.descriptions` (not in
     `modules`); graph-canvas draws the prose at this geometry. Collapsed (childless) groups get none.
   - **Two algorithms by depth:** the **root** uses `rectpacking` (`elk.aspectRatio=1.6`) so
     top-level groups + ungrouped modules pack into a compact, screen-shaped 2D grid instead of one
     long horizontal row. **Each group** uses `layered` (direction RIGHT) internally so its modules
     keep dependency flow. Edges are attached at the root but no algorithm routes them — React Flow
     draws edges itself from node positions, so dropping ELK's cross-group routing costs nothing.
2. `elk.layout()` computes parent-relative coords + group sizes (rectpacking root, layered groups).
3. `absolute-coords.ts` `toLayoutedGraph` — walks the result, accumulates offsets into absolute
   boxes, and splits groups from modules via the group-id set.

## Invariants (verified in `tests/layout.test.ts` against the golden model)

- Every module box is geometrically inside its group box.
- Sibling group boxes (same `parentId`) never overlap.
- Every box has finite coords and positive size.
- Top-level packing stays compact (overall `width / height < 2.5`), not a horizontal row.
- Deterministic: two runs of the same graph produce identical output.

## Checkpoint

`npx vite-node scripts/dump-layout.ts [out.svg]` lays out the golden model and writes an SVG to
eyeball nesting/non-overlap (geometry only; aesthetics are Phase 6).
