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
| `borderAnchor(box, toward)` / `bowedPath(from, to, bow)` | `features/graph_canvas/Private/border-anchor.ts` | **Pure.** `borderAnchor`: ray-from-center → border intersection point + which side it hit. `bowedPath`: quadratic SVG arc bowed perpendicular by `bow` px (used for soft edges so the dash clears overlapping imports). The testable seams for floating edges. |
| selectors | `domain/graph/Private/selectors.ts` | `findModule`, `groupOf`, `importsOf`, `importedBy`, `softEdgesOf`, `diagnosticsFor` — pure edge-list views. `importsOf`/`importedBy` filter to `kind === "import"` (soft edges don't leak into the import lists); `softEdgesOf` returns soft edges on either endpoint. |
| `GraphSessionStore` | `state/graph-session` | Now also owns `LayoutedGraph` (computed via injected `LayoutEngine` on load) and `selectedId`. Emits `phase-changed` + `selection-changed`. |
| `GraphCanvas` | `features/graph_canvas` | Renders React Flow with custom `group`/`module` nodes; applies `selected` per store; `colorMode="light"`. **Only** React-Flow-aware module. |
| `GraphCanvasController` | `features/graph_canvas` | Thin adapter: node click (modules only) → `store.select`; pane click → clear. |
| `InspectionPanel` | `features/inspection_panel` | Selected module's path, group, facade status, language, LOC, imports, imported-by, **Events** (soft edges: `emits → …` / `listens ← …` + token), diagnostics. `architectureViolation` diagnostics render **red** (matching the bypass edge); other diagnostics stay amber. |

## Aesthetic rules (the visual gate)

- **Group node:** colored 2px border + translucent fill (`color + "14"` alpha), uppercase header with
  optional icon glyph + label. Color from `GroupNode.color`, else a deterministic palette hash
  (`colors.ts`). `graph-canvas.css` strips React Flow's default node chrome (border/padding/bg) so the
  custom view's border is the **only** border — no double outline, no inset gap.
- **Header room:** the layout reserves vertical space for the header via `groupHeaderHeight` added to
  the group's ELK top padding (see `layout.md`), so module boxes never overlap the group label.
- **Module node:** card tinted to its **owning group's color** (matches the sample) — `color` text +
  `color + "1a"` fill + `color` border (2px facade w/ `★`, else 1px); selected → blue outline; compact
  11px **monospace** label (matches the sample's bracketed filenames; text darkened ~55% toward black
  for legibility), ellipsised. Group headers use a bold uppercase **sans-serif** stack. Projection
  copies the group color onto each grouped module's `data.color`
  (group `color` ?? `colorForGroup` hash); ungrouped modules fall back to slate `#64748b`.
- **Edge:** solid grey arrow (`import`); red + thicker when `isViolation` (a facade bypass, emitted
  by the backend drift pass — Phase 8). **Dashed** (`strokeDasharray "6 4"`) when `kind === "soft"`
  (an event/runtime relationship — Phase 9); direction coloring still applies, so a selected soft edge
  reads its role *and* its dash. A soft edge is drawn **bowed** (`bowedPath`, a quadratic arc offset
  ~36px perpendicular to its straight line) instead of the straight bezier used by imports, so its dash
  arcs clear of any import/violation edge sharing the same corridor (e.g. `store.ts → App.tsx` soft vs.
  the `TodoList.tsx → store.ts` violation) instead of overlapping it.
  Edges are **display-only** (no `onEdgeClick`/hover handlers), so `graph-canvas.css` sets
  `pointer-events: none` on `.react-flow__edge` — React Flow's invisible edge interaction path would
  otherwise swallow a `pointerdown` and break pan-by-drag that starts on an edge.
- **Edge routing (floating, no ELK routing):** ELK never routes edges — `FloatingEdge` draws them.
  Each endpoint floats to the border **facing the other node** (`borderAnchor`) instead of a fixed
  handle, so a node's out-edges fan across its border rather than sharing one right-side point
  (**Idea 1**). For an import that enters a facade **from outside its group**, the arrow anchors on
  the **group box** border, not the facade card (**Idea 2**); projection marks these with
  `data.groupTargetId` (internal same-group edges keep the box anchor). The module handles still
  exist for RF wiring but their position is ignored. **Group nodes carry the same invisible
  source/target handles** so a collapsed group can be an edge endpoint at L0 — React Flow silently
  drops any edge whose endpoint node lacks a Handle (error #008). Edge aggregation (folding N→1) is
  done by `projectForZoom` at L0 (group→group, deduped — see the semantic-zoom section).
- **Selection-aware edges + focus/context dimming:** when a module is selected, `edgeRole(edge,
  selectedId)` colors edges by role relative to it — edges leaving it (`source === selectedId`, its
  imports) render **orange**, edges entering it (`target === selectedId`, exports / imported-by) render
  **blue**. Selection wins over `isViolation` (so a selected module's import is orange, not red);
  unselected violation edges stay **red**, keeping a wrong import visually distinct from a selected
  import. `edgeOpacity(role)` then applies **single-level** focus
  dimming: a node's own edges stay opaque (1.0); every other edge sits at one quiet level (0.45),
  arrowheads kept, whether or not a selection is active — context stays legible instead of nearly
  vanishing. Both live in `edge-style.ts` (`GraphCanvas` passes `selectedId` per render); pure
  `edgeRole`/`edgeOpacity`/`borderAnchor` are the testable seams (edges don't render under jsdom).
- **Icons:** sparing, name → glyph map (`icon-map.tsx`); unknown names render no glyph.

## Semantic zoom L0/L1/L2 + metadata (Phase 10)

Detail level is a **pure projection over the immutable `ProjectGraph`** (TDD §8). The render
pipeline gained a graph-reduction step *before* layout:

```
ProjectGraph ──projectForZoom(graph, collapsedGroupIds)──▶ reduced ProjectGraph
             ──LayoutEngine.layout(reduced, sizeOpts)────▶ LayoutedGraph
             ──projectGraph(reduced, layout, renderOpts)─▶ React Flow models
```

- `projectForZoom` (`domain/graph/Private/zoom-projection.ts`, pure): drops modules under a
  collapsed group; keeps every collapsed group box visible (nested groups are not absorbed into a
  parent); **re-routes** edges whose endpoint was hidden onto the nearest collapsed ancestor group
  box; drops self-loops, **group↔ancestor-group edges** (a group nested at any depth inside the
  other — not just the direct parent), and dedups (a violation among
  the merged edges survives). A collapsed group stays
  as a visible empty container. `projectGraph` also filters module/symbol nodes under collapsed groups
  so nothing flashes while async re-layout catches up. The store calls `syncReduced()` synchronously
  on every collapse change before emitting `zoom-changed`. `allGroupIds` = the L0 default collapse set
  (every group); `topLevelGroupIds` remains for parentless roots. `levelFromZoom(factor)` maps the
  scroll zoom factor to 0/1/2 (`<0.55 / <1.7 / ≥1.7`).
- **Levels:** L0 collapses every group (all boxes stay visible, modules hidden); L1 expands
  everything; L2 keeps L1's node set but each module box renders a **source snippet** (first 12 lines,
  monospace). The store seeds the default collapse set per level, and `toggleGroup`/`collapse`/`expand`
  layer per-group overrides on top.
- **Layout sizing:** `LayoutEngine.layout(graph, {moduleWidth, moduleHeight, collapsedGroupSizes})` —
  L2 uses larger boxes so snippets fit. A **collapsed (childless) group keeps its expanded footprint**:
  the store captures every group's box size from the full (uncollapsed) layout into
  `expandedGroupSizes` and passes it as `collapsedGroupSizes`, so collapsing swaps the contents (modules
  → description) **without shrinking the box**. Groups never seen expanded fall back to a generous card
  size (`PRESETS.collapsedGroup{Width,Height}`, `elk-input.ts`).
- **L2 source is lazy, not in the contract:** `GraphSessionStore.ensureSources` fetches each visible
  module's source via `AnalysisClient.readModuleSource(root, path)` (Tauri command
  `read_module_source`, reusing `FsProjectSource::read_file`) and caches it. The `ProjectGraph` never
  carries file bodies. The mock client serves fixture source via Vite `?raw` imports.
- **Scroll drives the level, fit does not fight it:** `GraphCanvas.onMoveEnd` → `levelFromZoom` →
  `store.setZoomLevel` (guarded against no-ops). `FitView` fits **once per mount** (= once per project
  load, since `App` renders the canvas only when `ready`) and **never refits on a level change** — a
  programmatic refit would change the zoom and feed back into another level switch (L0 → fit → L2
  oscillation). The store re-layouts on every collapse/zoom change, **seq-guarded** so a stale async
  layout from rapid scrolling never overwrites a newer one. A `LevelBadge` shows the active level.
- **Metadata rendering:** `rf-projection` threads `annotation.descriptionShort` into node data. A
  collapsed group renders a **readable card** (`GroupNodeView` → `CollapsedCard`): a large uppercase
  label + icon over a wrapped 3-line description. Both font sizes **counter-scale with the live camera
  zoom** (`useStore(s => s.transform[2])`, clamped 1–2.4×) so the text stays legible as you zoom out
  to L0 instead of dwindling — a *read* of the camera, which the scroll-zoom oscillation lesson permits
  (it only forbids programmatic camera *writes*). Expanded groups keep the quiet header strip, but its
  label **also counter-scales** so the group name stays legible when zoomed out. **Module labels do
  *not* counter-scale** (fixed 11px / 9px world units): the module box is laid out to fit that size, so
  scaling the text against the camera made it overflow the box. Net L1 hierarchy: zoom out → group
  headers grow and dominate, module labels shrink with their boxes and always fit. `InspectionPanel` gains a
  `MetadataSection` (`This module` + `Group` annotation: type / short / long), rendering nothing when
  neither side is annotated (graceful fallback, TDD §10). `icon-map` covers the fixture's icon names.

Store surface (TDD §5.1): `getZoomLevel`, `getReducedGraph`, `getCollapsedGroupIds`, `getSourceCache`,
`setZoomLevel`, `expandGroup`/`collapseGroup`/`toggleGroup`; emits `zoom-changed` + `layout-changed`.
The canvas renders from `getReducedGraph()` + `getLayout()`, not the raw graph.

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
