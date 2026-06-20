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
| `projectGraph(graph, layout)` | `domain/graph/Private/rf-projection.ts` | **Pure.** Absolute layout boxes → React Flow nodes/edges. Group/module boxes become typed nodes; child positions made **parent-relative** (RF requirement); parents emitted before children. Tags edge `data.groupTargetId` when an edge enters a facade from outside its group (Idea 2 retarget — see Edge routing). |
| `FloatingEdge` | `features/graph_canvas/Private/FloatingEdge.tsx` | Custom RF edge: computes both endpoints via `borderAnchor` from live node geometry (`useInternalNode`). Honors `data.groupTargetId` by anchoring the arrow on the group box. |
| `borderAnchor(box, toward)` | `features/graph_canvas/Private/border-anchor.ts` | **Pure.** Ray-from-center → border intersection point + which side it hit. The testable seam for floating edges. |
| selectors | `domain/graph/Private/selectors.ts` | `findModule`, `groupOf`, `importsOf`, `importedBy`, `diagnosticsFor` — pure edge-list views. |
| `GraphSessionStore` | `state/graph-session` | Now also owns `LayoutedGraph` (computed via injected `LayoutEngine` on load) and `selectedId`. Emits `phase-changed` + `selection-changed`. |
| `GraphCanvas` | `features/graph_canvas` | Renders React Flow with custom `group`/`module` nodes; applies `selected` per store; `colorMode="light"`. **Only** React-Flow-aware module. |
| `GraphCanvasController` | `features/graph_canvas` | Thin adapter: node click (modules only) → `store.select`; pane click → clear. |
| `InspectionPanel` | `features/inspection_panel` | Selected module's path, group, facade status, language, LOC, imports, imported-by, diagnostics. |

## Aesthetic rules (the visual gate)

- **Group node:** colored 2px border + translucent fill (`color + "14"` alpha), uppercase header with
  optional icon glyph + label. Color from `GroupNode.color`, else a deterministic palette hash
  (`colors.ts`). `graph-canvas.css` strips React Flow's default node chrome (border/padding/bg) so the
  custom view's border is the **only** border — no double outline, no inset gap.
- **Header room:** the layout reserves vertical space for the header via `groupHeaderHeight` added to
  the group's ELK top padding (see `layout.md`), so module boxes never overlap the group label.
- **Module node:** white card; facade → dark 2px border + `★`; selected → blue outline; compact 11px label, ellipsised.
- **Edge:** solid grey arrow (`import`); red + thicker when `isViolation` (Phase 8 turns these on).
- **Edge routing (floating, no ELK routing):** ELK never routes edges — `FloatingEdge` draws them.
  Each endpoint floats to the border **facing the other node** (`borderAnchor`) instead of a fixed
  handle, so a node's out-edges fan across its border rather than sharing one right-side point
  (**Idea 1**). For an import that enters a facade **from outside its group**, the arrow anchors on
  the **group box** border, not the facade card (**Idea 2**); projection marks these with
  `data.groupTargetId` (internal same-group edges keep the box anchor). The module handles still
  exist for RF wiring but their position is ignored. Edge aggregation (folding N→1) is deferred to
  group-collapse work.
- **Selection-aware edges + focus/context dimming:** when a module is selected, `edgeRole(edge,
  selectedId)` colors edges by role relative to it — edges leaving it (`source === selectedId`, its
  imports) render **red**, edges entering it (`target === selectedId`, exports / imported-by) render
  **blue**. Selection wins over `isViolation`. `edgeOpacity(role)` then applies **single-level** focus
  dimming: a node's own edges stay opaque (1.0); every other edge sits at one quiet level (0.45),
  arrowheads kept, whether or not a selection is active — context stays legible instead of nearly
  vanishing. Both live in `edge-style.ts` (`GraphCanvas` passes `selectedId` per render); pure
  `edgeRole`/`edgeOpacity`/`borderAnchor` are the testable seams (edges don't render under jsdom).
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
