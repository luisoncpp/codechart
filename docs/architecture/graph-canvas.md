# Graph canvas + projection + inspection (frontend render)

The Phase 6 rendering stack: `ProjectGraph` + `LayoutedGraph` → on-screen architecture map
matching `sample-img/img1.png`, plus a selection-driven inspection panel.

## Data flow

```
GraphSessionStore  ──(graph + layout)──>  projectGraph()  ──>  ProjectedGraph {nodes, edges}
        │                                                              │
        │ selectedId                                       GraphCanvas (React Flow)
        ▼                                                              │ onNodeClick
  InspectionPanel  <──(selection-changed)── GraphCanvasController.onNodeClick → store.select
```

## Responsibilities

| Piece | File | Role |
|-------|------|------|
| `projectGraph(graph, layout)` | `domain/graph/Private/rf-projection.ts` | **Pure.** Absolute layout boxes → React Flow nodes/edges. Group/module boxes become typed nodes; child positions made **parent-relative** (RF requirement); parents emitted before children. |
| selectors | `domain/graph/Private/selectors.ts` | `findModule`, `groupOf`, `importsOf`, `importedBy`, `diagnosticsFor` — pure edge-list views. |
| `GraphSessionStore` | `state/graph-session` | Now also owns `LayoutedGraph` (computed via injected `LayoutEngine` on load) and `selectedId`. Emits `phase-changed` + `selection-changed`. |
| `GraphCanvas` | `features/graph_canvas` | Renders React Flow with custom `group`/`module` nodes; applies `selected` per store; `colorMode="light"`. **Only** React-Flow-aware module. |
| `GraphCanvasController` | `features/graph_canvas` | Thin adapter: node click (modules only) → `store.select`; pane click → clear. |
| `InspectionPanel` | `features/inspection_panel` | Selected module's path, group, facade status, language, LOC, imports, imported-by, diagnostics. |

## Aesthetic rules (the visual gate)

- **Group node:** colored 2px border + translucent fill (`color + "14"` alpha), uppercase header with
  optional icon glyph + label. Color from `GroupNode.color`, else a deterministic palette hash
  (`colors.ts`).
- **Module node:** white card; facade → dark 2px border + `★`; selected → blue outline; compact 11px label, ellipsised.
- **Edge:** solid grey arrow (`import`); red + thicker when `isViolation` (Phase 8 turns these on).
- **Icons:** sparing, name → glyph map (`icon-map.tsx`); unknown names render no glyph.

## Invariants to preserve

- Projection is **pure** and selection-free (selection overlaid in the canvas) → testable by counts.
- Parent nodes precede children in the node array (`sortByDepth`).
- Child node `position` is relative to its parent box; group nesting is honored via `parentId`.
- The store computes layout only for non-empty graphs (`empty` phase → `layout = null`).

## Fit-on-init

`fitView` alone fits before nodes are measured inside embedded webviews. `FitView.tsx` refits via
`useNodesInitialized` once measurement completes (keyed on node count).

## Wiring

`app` composes `createMockAnalysisClient()` (returns the golden fixture — runs the whole UI with zero
Rust, Phase 7 swaps in Tauri) + `ElkLayoutEngine` into the store, then renders the loader bar above
`GraphCanvas` + `InspectionPanel` when `phase === "ready"`.
