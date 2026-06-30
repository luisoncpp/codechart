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
        │ focusOn(moduleId) ──(focus-requested)──> FocusNode → setCenter(absolute module center)
        ▲
        └── EdgeList click (Imports / Imported by)
```

## Responsibilities

| Piece | File | Role |
|-------|------|------|
| `projectGraph(graph, layout)` | `domain/graph/Private/rf-projection.ts` | **Pure.** Absolute layout boxes → React Flow nodes/edges. Group/module boxes become typed nodes; child positions made **parent-relative** (RF requirement); parents emitted before children. Tags edge `data.groupTargetId` when an edge enters a facade from outside its group (Idea 2 retarget — see Edge routing). |
| `FloatingEdge` | `features/graph_canvas/Private/FloatingEdge.tsx` | Custom RF edge: computes both endpoints via `borderAnchor` from live node geometry (`useInternalNode`). Honors `data.groupTargetId` by anchoring the arrow on the group box. |
| `borderAnchor(box, toward)` / `bowedPath(from, to, bow)` | `features/graph_canvas/Private/border-anchor.ts` | **Pure.** `borderAnchor`: ray-from-center → border intersection point + which side it hit. `bowedPath`: quadratic SVG arc bowed perpendicular by `bow` px (used for soft edges so the dash clears overlapping imports). The testable seams for floating edges. |
| selectors | `domain/graph/Private/selectors.ts` | `findModule`, `findGroup`, `groupOf`, `modulesInGroup`, `childGroupsOf`, `groupImportsOf`, `groupImportedBy`, `diagnosticsForGroup`, `edgeFocusForSelection`, `importsOf`, `importedBy`, `softEdgesOf`, `diagnosticsFor`, `architectureViolations` — pure edge-list views. |
| `GraphSessionStore` | `state/graph-session` | Now also owns `LayoutedGraph` (computed via injected `LayoutEngine` on load) and `selectedId`. Emits `phase-changed` + `selection-changed` + `focus-requested`. `focusOn(moduleId)` selects a module, expands collapsed ancestor groups when needed, and asks the canvas to center on it. |
| `GraphCanvas` | `features/graph_canvas` | Renders React Flow with custom `group`/`module` nodes; applies `selected` per store; `colorMode="light"`. **Only** React-Flow-aware module. `FocusNode` centers the viewport on inspector import navigation. |
| `GraphCanvasController` | `features/graph_canvas` | Thin adapter: node click (modules + groups) → `store.select`; pane click → clear; right-click module/symbol → context menu path. |
| `ModuleContextMenu` | `features/graph_canvas` | Fixed-position menu on module/symbol right-click; **Reveal in file explorer** via `ShellClient` (`ipc/shell-client`, Tauri `revealItemInDir`). |
| `InspectionPanel` | `features/inspection_panel` | Routes to `ModuleInspection` or `GroupInspection` by selection kind. Module view: path, group, facade status, language, LOC, imports, imported-by, **soft-edge sections**, diagnostics. Group view: parent, facades, member modules, child groups, cross-boundary imports/imported-by (deduped), group diagnostics, `@Architecture` metadata. **Imports / Imported by** entries are clickable — they call `store.focusOn` to select and center the related module on the canvas. `architectureViolation` diagnostics render **red** (matching the bypass edge); other diagnostics stay amber. **Layout:** collapsible right-side panel; `App` owns `inspectorOpen` + `inspectorWidth` (default 280px, clamped 200–720px on drag); `PanelResizeHandle` on the left edge; width survives hide/show within the session via `InspectorLayoutProvider` → `PanelChrome`. |

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
  for legibility). The filename **wraps across multiple lines** at camelCase and separator boundaries
  (`wrap-identifier.ts` + explicit `<br>` in `ModuleNodeView`, no ellipsis);
  the box is sized to fit it (see **Module box sizing**). Group headers use a bold uppercase **sans-serif** stack. Projection
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
- **Selection-aware edges + focus/context dimming:** when a module or group is selected,
  `edgeFocusForSelection(graph, selectedId)` yields either a module id, a collapsed group id,
  or `{ groupId, moduleIds }` for an expanded group. `edgeRole(edge, focus)` colors edges by role
  relative to it — edges leaving the focus (`source` in scope) render **orange**, edges entering it
  (`target` in scope) render **blue**. Selection wins over `isViolation` (so a selected module's
  import is orange, not red); unselected violation edges stay **red**, keeping a wrong import
  visually distinct from a selected import. `edgeOpacity(role)` then applies **single-level** focus
  dimming: a node's own edges stay opaque (1.0); every other edge sits at one quiet level (0.45),
  arrowheads kept, whether or not a selection is active — context stays legible instead of nearly
  vanishing. Both live in `edge-style.ts` (`GraphCanvas` passes `edgeFocusForSelection` per render);
  pure `edgeRole`/`edgeOpacity`/`borderAnchor` are the testable seams (edges don't render under jsdom).
- **Diff overlay (narrative diff visualizer):** optional session overlay from `GraphSessionStore.getDiffOverlay()`.
  Enter via **Visualize diff…** (`DiffModal`: paste unified diff or pick two git commits when the
  project root is a repo). `domain/diff` compares before/after graphs (git mode) or parses diff paths
  (paste mode); **unchanged modules render at ~40% opacity** so affected/deleted modules pop;
  **group titles and descriptions dim to the same level** so module diff highlights read first.
  `applyDiffOverlay` stamps `ModuleNodeData.diffState` (`affected` → **green** 3px border,
  `deleted` → **red** 3px border, `unchanged` → dimmed, ghost modules positioned from the before
  snapshot layout) and `EdgeData.diffState` (`added` → **green** full-opacity arrow, `removed` → **red**
  line with **X** head). **L0 bird's-eye is disabled** while diff is active — scroll zoom floors at L1
  so module-level highlights remain visible; clearing the overlay restores normal L0 behavior.
  **L2 source panels and the symbol preview widget** show unified-diff rows:
  green `+` lines for additions, red `-` lines for deletions (`DiffCodeLines`). Diff styling wins over
  selection dimming for stamped edges. **Stop visualizing diff** clears overlay state; reload clears it too.
  **Mutually exclusive with the activity heatmap** — diff on pauses heat controls and restores prior heat state when cleared.
- **Activity heatmap (git metrics overlay):** when the project root is a git repo, `analyze_project`
  stamps `ModuleMetrics.churn`, `bugRisk`, and `fixCommits` (90-day window, Rust `git::enrich_module_metrics`).
  `ViewControls` exposes a **Heatmap** toggle + **Activity | Risk** segmented switch (Activity default);
  disabled without git (tooltip: “Requires a git repository”). `computeHeatProjection` (`heat-scores.ts`,
  pure) percentile-ranks visible modules (respecting **Hide tests**) into `heatScore`/`heatVisible` on
  projected nodes. Group scores use the **full** graph (not the L0-reduced view) so
  collapsed bird's-eye boxes match expanded L1 tints. Every module/group gets a score in
  `[0, 1]` (inactive = `0`, coldest gradient stop); brand colors are never used while the
  overlay is on. Visual stack: diff > selection > violation > heat > default chrome.
- **Icons:** sparing, name → glyph map (`icon-map.tsx`); unknown names render no glyph.

## Semantic zoom L0/L1/L2 + metadata (Phase 10)

Detail level is a **pure projection over the immutable `ProjectGraph`** (TDD §8). The render
pipeline gained a graph-reduction step *before* layout:

```
ProjectGraph ──filterTestModules?──▶ base graph
             ──projectForZoom(base, collapsedGroupIds)──▶ reduced ProjectGraph (display/edges)
             ──LayoutEngine.layout(layoutGraph, sizeOpts)──▶ LayoutedGraph
             ──projectGraph(reduced, layout, renderOpts)─▶ React Flow models
```

Layout uses the test-filtered **full** graph at L0 (L0 collapse is projection-only there) and
applies `projectForZoom` for manual per-group collapse at L1+. Display/edge routing always runs
`filterTestModules` **before** `projectForZoom` so empty-group pruning never sees modules already
hidden by zoom collapse.

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
  everything; L2 renders each module as a scrollable document consisting of the module description at the top (preferring the long description if available) and the full syntax-highlighted source code below it. All text elements are counter-scaled to remain small/compact in screen space, and the scrollable area is clamped dynamically to fit completely inside the visible viewport. The store seeds the default collapse set per level, and `toggleGroup`/`collapse`/`expand`
  layer per-group overrides on top.
- **Module box sizing:** `moduleBoxSize(label, symbols)` (`domain/layout/Private/module-box-metrics.ts`,
  pure, shared constants in `MODULE_BOX`) sizes every module to fit its content — the wrapped filename plus
  the packed exported-symbol grid — then **clamps it to a screen-like aspect window: never wider than 4:3,
  never taller than 4:5** (growing the deficient dimension, never shrinking). The box is treated as a fixed
  *viewport* — richer zoomed-in content (symbols at L1.5, source/MD at L2) lives inside and scrolls — so a
  predictable, well-proportioned footprint matters more than hugging content. The symbol footprint is sized
  from the symbols' **total area** at a target aspect (`symbolContentSize`), *not* a worst-case
  `sqrt(N)×maxWidth` grid — so a symbol-heavy module (e.g. an `ipc.ts` with ~80 long export names) stays
  compact (~800px) instead of ballooning past 1800px with mostly-empty space. The base `120×90` sits exactly
  at the 4:3 edge and is the floor; `PRESETS.module{Width,Height}` match it. `moduleElkNode` pins the
  compound (symbol) footprint to this size via `elk.nodeSize.minimum` **and** sets the inner rectpacking
  `elk.aspectRatio` to the same clamped ratio, so symbol boxes stay inside the chosen viewport instead of
  stretching it wide. Sizing uses the L1 font (11px, the largest the label is drawn), so it also fits the
  smaller 9px detail label. The `keeps every module box within the 4:5–4:3 aspect window` layout test
  guards the end-to-end guarantee through ELK.
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
- **Group descriptions (multi-level):** `rf-projection` threads both `descriptionShort` and
  `descriptionLong` into group node data, plus `showLong` (= `showSymbols`, i.e. L1.5+). The view shows
  progressively more prose as you zoom in:
  - **L0 (collapsed card):** `collapsedDescription` **prefers `descriptionLong`** when it fits the card
    at a legible font (`fitsBox`, 14px base), else falls back to `descriptionShort`. The text uses the
    **darkened group color** (`darken(data.color)`), not the old grey, and its line clamp is derived
    from the card height.
  - **L1 (expanded):** `GroupDescription` draws `descriptionShort` **directly in the group** (no box) at
    `data.descriptionBox` (parent-relative). ELK vertically *centers* a short column, so the reserved slot
    floats mid-group with a gap under the header; **projection raises `y`** (`freeTopFor`) to the highest
    spot in the box's x-column that stays **clear of every sibling box above it** — collision-checked, not
    blindly pinned to the top (a module ELK placed up there blocks it; the box stops just below). Floored
    at the group content top (`groupPadding + groupHeaderHeight`). `textAlign: left` (React Flow's node
    default is centered). World units at `DESC_BOX.l1FontSize` (22, = `LABEL_FIT.maxFont`) — reads at the
    same scale as the module filenames, not counter-scaled.
  - **L1.5+ (`showLong`):** same box shows `descriptionLong` (falls back to `descriptionShort`) at the
    smaller `DESC_BOX.fontSize` (16): the long prose is denser, so a modest font keeps the box compact
    while L1's short blurb still reads large. The two fonts are independent on purpose.
  - **Reserved layout space (packed, not a band):** `elk-input` injects a **real leaf box** per annotated
    group (`descriptionBoxId(groupId)`) into the group's layered flow, sized by
    `descriptionBoxSize(short, long)` (the *same* content-fit philosophy as `moduleBoxSize` — width
    capped, height grown to fit the prose, so it never truncates). It's packed to fit **both** the long
    text at `fontSize` *and* the short blurb at the larger `l1FontSize` (union of the two), so neither
    level overflows. ELK then **packs the modules around it** instead of wasting a full-width strip. The
    box is pinned to the group's top-left via `layerConstraint: FIRST` + `considerModelOrder` +
    `separateConnectedComponents=false` (the last so an all-disconnected group like `shared` still honors
    model order). The layout splits these into `LayoutedGraph.descriptions` (a sibling of
    `modules`/`symbols`); `rf-projection` stashes each one's parent-relative geometry into the owning
    group's `descriptionBox` and emits **no** node for it. Collapsed groups get no box (they render their
    own card).
- **Metadata rendering:** A
  collapsed group renders a **readable card** (`GroupNodeView` → `CollapsedCard`): a large uppercase
  label + icon over a wrapped description (see Group descriptions above). Both font sizes **counter-scale with the live camera
  zoom** (`useStore(s => s.transform[2])`, clamped 1–2.4×) so the text stays legible as you zoom out
  to L0 instead of dwindling — a *read* of the camera, which the scroll-zoom oscillation lesson permits
  (it only forbids programmatic camera *writes*). Expanded groups keep the quiet header strip, but its
  label **also counter-scales** so the group name stays legible when zoomed out. **Module labels do
  *not* counter-scale** against the camera (still world units, so they can't overflow the box). But the
  L1 centered label is **fit to its box** rather than fixed at 11px: `fitLabelFontSize(label, w, h)`
  (`module-box-metrics.ts`, pure) picks the largest font (capped `LABEL_FIT.maxFont` 22px, floored at the
  11px base) at which the camelCase-aware wrapped filename fits the box — so a short name like `index.ts` fills a
  large box instead of floating tiny in it. `ModuleNodeView` reads the node's laid-out `width`/`height`
  (`NodeProps`) to compute it; L2 detail labels stay at the compact 9px. Net L1 hierarchy: zoom out → group
  headers grow and dominate, module labels shrink with their boxes and always fit. `InspectionPanel` gains a
  `MetadataSection` (`This module` + `Group` annotation: type / short / long), rendering nothing when
  neither side is annotated (graceful fallback, TDD §10). `icon-map` covers the fixture's icon names.
- **Collapse/expand affordance:** every group renders a real `ToggleButton` (chevron `▾`/`▸`) tagged
  `data-group-toggle`. `GraphCanvasController.onNodeClick` inspects the click target (`closest("[data-group-toggle]")`)
  and calls `store.toggleGroup` on a single click; double-clicking anywhere on the group still toggles via
  `onNodeDoubleClick`. Keep the `data-group-toggle` attribute — it's how the controller distinguishes a
  toggle click from a select/body click without threading a callback through the pure projection.
- **Connection disconnect affordance:** every group and module renders a plug toggle (`ConnectionToggle`, 🔌)
  at the **upper-right** corner, tagged `data-connection-toggle`. Click → `store.toggleGroupConnection` /
  `toggleModuleConnection`. Disconnected nodes stay visible; edges touching them are dropped by
  `filterDisconnectedEdges` (`domain/graph/Private/connection-filter.ts`, pure) in `GraphSessionStore.reduceForView`.
  Defaults come from `GroupNode.disconnectedByDefault` / `disconnectedModuleIds` (parsed from `*.group.md`
  `disconnected` / `disconnectedModules`); session state seeds on load and user toggles layer on top.
  Modules inherit a parent group's disconnect (ancestor chain). Inspection still lists imports on the raw graph.
- **Symbol Source Preview Widget (L1.5):** Clicking an exported symbol node in the L1.5 zoom view selects its parent module and opens a resizable, scrollable popup widget (`SymbolSourceWidget`) next to the symbol. The widget displays the module's source code, automatically locating and scrolling to focus on the line containing the symbol's definition (matching class/function/const/etc. patterns). It automatically dismisses when the canvas viewport is moved, when selecting another node or clicking the pane, or on any click outside the widget.

Store surface (TDD §5.1): `getZoomLevel`, `getReducedGraph`, `getCollapsedGroupIds`,
`getDisconnectedGroupIds`, `getDisconnectedModuleIds`, `getSourceCache`,
`setZoomLevel`, `expandGroup`/`collapseGroup`/`toggleGroup`,
`toggleGroupConnection`/`toggleModuleConnection`; emits `zoom-changed` + `layout-changed` + `view-changed`.
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
`GraphCanvas` + a collapsible, drag-resizable `InspectionPanel` when `phase === "ready"`.
`App` holds `inspectorOpen` and `inspectorWidth`; the panel facade accepts `width` / `onWidthChange`.
