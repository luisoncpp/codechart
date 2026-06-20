# Layout (`domain/layout`)

Frontend seam that turns a coordinate-free `ProjectGraph` into positioned boxes.
ELK is an implementation detail kept private behind `index.ts`.

## Public interface (`domain/layout/index.ts`)

- `interface LayoutEngine { layout(graph: ProjectGraph): Promise<LayoutedGraph> }`
- `class ElkLayoutEngine` — the only implementation.
- `LayoutedGraph` / `LayoutBox` data types.

```ts
LayoutBox  = { id, parentId, x, y, width, height }   // absolute top-left
LayoutedGraph = { groups: LayoutBox[], modules: LayoutBox[], width, height }
```

Coordinates are **absolute** (not ELK's parent-relative). Phase 6 (React Flow) can derive
parent-relative offsets by subtracting the parent box when it needs `parentNode` children.

## Pipeline (private)

1. `elk-input.ts` `buildElkGraph` — `ProjectGraph` → hierarchical `ElkNode`:
   - Groups become compound nodes nested by `parentId`; modules become leaf nodes under their
     `groupId` (ungrouped nodes sit at the root). Children are **sorted by id** for determinism.
   - Leaf size + spacing/padding come from `PRESETS` (deterministic; no randomness). Edges are
     attached at the root with `elk.hierarchyHandling=INCLUDE_CHILDREN` so cross-group edges route.
2. `elk.layout()` (elkjs `layered`, direction RIGHT) computes parent-relative coords + group sizes.
3. `absolute-coords.ts` `toLayoutedGraph` — walks the result, accumulates offsets into absolute
   boxes, and splits groups from modules via the group-id set.

## Invariants (verified in `tests/layout.test.ts` against the golden model)

- Every module box is geometrically inside its group box.
- Sibling group boxes (same `parentId`) never overlap.
- Every box has finite coords and positive size.
- Deterministic: two runs of the same graph produce identical output.

## Checkpoint

`npx vite-node scripts/dump-layout.ts [out.svg]` lays out the golden model and writes an SVG to
eyeball nesting/non-overlap (geometry only; aesthetics are Phase 6).
