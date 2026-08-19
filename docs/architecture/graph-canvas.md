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

## Internal structure (subgroups)

Both deep modules organize their implementation into subfolders, each a config subgroup
(`*.group.md`, facade-less = public inside the parent):

- `domain/graph`: `model/` (ts-rs generated contract types — **also the `TS_RS_EXPORT_DIR`**,
  never hand-edit), `Private/projection/` (rf-projection\* + `node-data` + palette),
  `Private/reduction/` (zoom projection/levels, test filtering, disconnect filtering),
  `Private/heat/` (heat scores/colors). Flat: `index.ts`, `symbol-id.ts`, `selectors.ts`,
  `symbol-kind*.ts`.
- `features/graph_canvas/Private`: `edges/`, `nodes/`, `descriptions/`, `l2/`, `highlight/`,
  `wiki_links/`, `navigation/`, `controller/`, `toolbar/`, plus the nested deep modules
  `preview_frames/` and `project_search/` (those two keep `index.ts` facades). Flat:
  `GraphCanvas.tsx`, `graph-canvas.css`, `review-note-canvas.ts`. `wiki_links/` holds only pure
  link knowledge (syntax scan, path resolution, candidate order, the `marked` extension, the DOM
  read); `highlight/` renders links and `preview_frames/` opens them — dependencies point that
  one way.

## Responsibilities

| Piece | File | Role |
|-------|------|------|
| `projectGraph(graph, layout)` | `domain/graph/Private/projection/rf-projection.ts` | **Pure.** Absolute layout boxes → React Flow nodes/edges. Group/module boxes become typed nodes; child positions made **parent-relative** (RF requirement); parents emitted before children. Tags edge `data.groupTargetId` when an edge enters a facade from outside its group (Idea 2 retarget — see Edge routing). |
| `EdgeLayer` + `segmentForEdge` | `features/graph_canvas/Private/edges/EdgeLayer.tsx`, `edge-path.ts` | Custom SVG edge layer (portal into RF's `.react-flow__edges`); React Flow receives `edges={[]}`. `segmentForEdge` computes both endpoints via `borderAnchor` from live node boxes (`boxesFromFlowNodes`). Honors `data.groupTargetId` by anchoring the arrow on the group box. |
| `borderAnchor(box, toward)` / `bowedPath(from, to, bow)` | `features/graph_canvas/Private/edges/border-anchor.ts` | **Pure.** `borderAnchor`: ray-from-center → border intersection point + which side it hit. `bowedPath`: quadratic SVG arc bowed perpendicular by `bow` px (used for soft edges so the dash clears overlapping imports). The testable seams for floating edges. |
| selectors | `domain/graph/Private/selectors.ts` | `findModule`, `findGroup`, `groupOf`, `modulesInGroup`, `childGroupsOf`, `groupImportsOf`, `groupImportedBy`, `diagnosticsForGroup`, `edgeFocusForSelection`, `importsOf`, `importedBy`, `softEdgesOf`, `diagnosticsFor`, `architectureViolations` — pure edge-list views. |
| `GraphSessionStore` | `state/graph-session` | Owns `LayoutedGraph`, `selectedId`, and browser-style selection history. New selections truncate the forward branch; back/forward only move its pointer. Emits `phase-changed` + `selection-changed` + `focus-requested`. `focusOn(moduleId)` selects a module, expands collapsed ancestor groups when needed, and asks the canvas to center on it. Session **Hide dot directories** (default on) is passed into every `analyze_project` / snapshot load; toggling reloads the project. |
| `GraphCanvas` | `features/graph_canvas` | Renders React Flow with custom `group`/`module` nodes; applies `selected` per store; `colorMode="light"`. **Only** React-Flow-aware module. `FocusNode` centers the viewport for inspector and Review Note navigation. Sets `onlyRenderVisibleElements` so only viewport-intersecting nodes stay mounted — without it, the one-node-per-symbol swarm at L1.5 made panning composite-bound. Safe with `EdgeLayer`: culling is render-only, and the edge layer reads the projected `nodes` prop + store `nodeLookup`, which culling never filters, so edges to off-screen nodes keep drawing. |
| `GraphCanvasController` | `features/graph_canvas` | Thin adapter: node click (modules + groups) → `store.select`; pane click → clear; right-click module/symbol → context menu path. |
| `SelectionNavigation` | `features/graph_canvas` | Top-left back/forward controls plus `Alt+Left` / `Alt+Right`; disabled states come from the session history pointer. |
| `ViewMenu` / `SearchMenu` | `features/graph_canvas` (facade exports) | Toolbar dropdowns (rendered by `App` into `ProjectLoaderPanel`'s `menus` slot, built on the shared `src/ui/dropdown_menu` module). View ▾: Hide tests, **Hide dot directories** (default on; re-analyzes), Line counts, Heatmap + Activity/Risk, Visualize diff…; Search ▾: Search project (Ctrl+Shift+F), Go to file (Ctrl+P), Go to symbol. |
| `CanvasUiState` | `features/graph_canvas/Private/controller/canvas-ui-state.ts` (facade export) | Transient UI flags (`findBarOpen`, `findBarMode`, `diffModalOpen`, `lineCountsVisible`) shared between the toolbar menus and `GraphCanvas`; kept out of `GraphSessionStore`. `App` instantiates it and resets on `phase-changed`. |
| `HeatmapLegend` | `features/graph_canvas` | Top-right gradient chip, shown only while the heatmap is on (below `LevelBadge`). Its timeframe label opens `MetricsWindowModal`; the heatmap toggles themselves live in the View menu. |
| `ModuleContextMenu` | `features/graph_canvas` | Fixed-position menu on module/symbol right-click; opens the module's L2 document in a preview frame, opens the absolute path in the project-configured editor, copies the graph-relative path, or reveals the file via `ShellClient`. Deleted diff files keep preview and copy; editor/explorer are disabled. |
| `TokenText` | `features/graph_canvas/Private/highlight/TokenText.tsx` | Renders one syntax token's text with **nested** sub-spans: wiki links (`hl-wiki-link`) outside, find matches (`hl-match`) inside. Nesting — never sibling-splitting — is what keeps `hl-clickable` navigation reading a whole identifier from `textContent`. `DiffCodeLine` renders the row; `DiffCodeLines` owns rows, tokenizing, and the per-row link scan. |
| `LineTokenizer` / `tokenizeCode` | `features/graph_canvas/Private/highlight/line-tokenizer.ts`, `highlighter.ts` | Lexical highlighter. `LineTokenizer` tokenizes **one line at a time** and is the only stateful piece: it remembers an open block comment (`getLanguageForFile().blockComment`, `/* */` for every language except Python/`.prefab`) so `/* … */` spanning lines stays `hl-comment`. Renderers that emit rows independently (`DiffCodeLines`) **must reuse one instance per document, in line order**; `remove` diff rows come from the before-snapshot and are rendered plain, so they never touch the state. `tokenizeCode(code, path)` is the stateless whole-text wrapper. Consequence: multi-line **strings** (template literals, Python docstrings) are still tokenized per line and do not carry. |
| `InspectionPanel` | `features/inspection_panel` | Routes to `ModuleInspection` or `GroupInspection` by selection kind. Module view: path, group, facade status, language, LOC, imports, imported-by, **soft-edge sections**, diagnostics. Group view: parent, facades, member modules, LOC (module-tree total), child groups, cross-boundary imports/imported-by (deduped), group diagnostics, `@Architecture` metadata. **Imports / Imported by** entries are clickable — they call `store.focusOn` to select and center the related module on the canvas. `architectureViolation` diagnostics render **red** (matching the bypass edge); other diagnostics stay amber. **Layout:** collapsible right-side panel; `App` owns `inspectorOpen` + `inspectorWidth` (default 280px, clamped 200–720px on drag); `PanelResizeHandle` on the left edge; width survives hide/show within the session via `InspectorLayoutProvider` → `PanelChrome`. |

## Aesthetic rules (the visual gate)

- **Group node:** colored 2px border + translucent fill (`color + "14"` alpha), uppercase header with
  optional icon glyph + label. Color from `GroupNode.color`, else a deterministic palette hash
  (`colors.ts`). `graph-canvas.css` strips React Flow's default node chrome (border/padding/bg) so the
  custom view's border is the **only** border — no double outline, no inset gap.
- **Header room:** the layout reserves vertical space for ordinary children and a measured top-left
  title obstacle for nested subgroup containers (see `layout.md`), so neither modules nor subgroup
  boxes overlap the counter-scaled group label. The expanded header's counter-scale is **clamped**
  to the scale that obstacle was reserved at (`expandedHeaderScale`, `domain/layout`) — a group
  expanded below the L0 boundary must not outgrow its reserve.
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
  While a **diff overlay** is active, added edges are green (`#16a34a`), removed edges are red (`#dc2626`) with an **X** head,
  and rename edges are yellow (`#d97706`, arrow head) from the deleted module to the created one. All diff edges
  render thicker (`2.8px`) than normal focused edges (`2.0px`) and sit in the edge layer (`z-index: 0`) behind opaque
  module cards (`z-index: 1`); the module cards themselves stay red/green.
  Edges are **display-only** (no `onEdgeClick`/hover handlers), so `graph-canvas.css` sets
  `pointer-events: none` on `.react-flow__edge` — React Flow's invisible edge interaction path would
  otherwise swallow a `pointerdown` and break pan-by-drag that starts on an edge.
- **Edge routing (floating, no ELK routing):** ELK never routes edges — `EdgeLayer` draws them via `segmentForEdge`.
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
  visually distinct from a selected import. `edgeOpacity(role, connected, hasFocus)` applies focus
  dimming: a node's own edges stay opaque (1.0); other context edges sit at 0.45 opacity. When visualizing
  diffs with no selection, all diff edges stay fully opaque (1.0); when a module is selected, diff edges
  not connected to that module dim to 0.45 while connected diff edges stay fully opaque. Both live in
  `edge-style.ts` (`GraphCanvas` passes `edgeFocusForSelection` per render); pure `edgeRole`/`styleEdge`/`borderAnchor`
  are the testable seams (edges don't render under jsdom).
- **Diff overlay (narrative diff visualizer):** optional session overlay from `GraphSessionStore.getDiffOverlay()`.
  Enter via toolbar **View ▾ → Visualize diff…** (`DiffModal`: paste unified diff or pick two git revisions when the
  project root is a repo). The **after** list includes **Local changes**: tracked staged/unstaged
  changes come from `git diff <before>` (with optional `--ignore-submodules=all` via **Exclude submodules**,
  default on; also drops modules under gitlink paths from the graph compare), while untracked files are full-add patches only when they
  survive Git ignore rules and have a module in the loaded graph. `domain/diff` compares before/after graphs (git mode) or parses diff paths
  (paste mode); **unchanged modules render at ~40% opacity** so affected/deleted modules pop;
  **group titles and descriptions dim to the same level** so module diff highlights read first.
  `applyDiffOverlay` stamps `ModuleNodeData.diffState` (`affected` → **green** 3px border,
  `deleted` → **red** 3px border, `unchanged` → dimmed, ghost modules placed by greedy collision
  avoidance — commit-to-commit also seeds positions from a before-graph layout) and `EdgeData.diffState`
  (`added` → **green** full-opacity arrow, `removed` → **red**
  line with **X** head). At **L1.5**, `classifySymbolChanges` compares export membership and intersects
  changed old/new line numbers with symbol declaration/implementation ranges. Symbol boxes render
  added as **green/solid**, modified as **yellow/dotted**, and commit-to-commit restores removed symbols
  as **red/dashed** ghosts from the before layout; local changes skip that extra layout. Exact symbol states are
  available for commit/local comparisons, which can read both snapshots; pasted diffs remain module-level.
  Historical comparisons load each Git tree once and reuse its in-memory source for both graph analysis
  and changed-source extraction; Git child processes do not create console windows on Windows.
  **L0 bird's-eye is disabled** while diff is active — scroll zoom floors at L1
  so module-level highlights remain visible; clearing the overlay restores normal L0 behavior.
  **L2 source panels and the symbol preview widget** show unified-diff rows:
  green `+` lines for additions, red `-` lines for deletions (`DiffCodeLines`). A deleted file's
  **Open file preview** uses empty after-text plus `lineDiffByPath` (or a synthesized all-removed
  diff from `beforeSourceByPath`) so the frame is all red; editor/explorer menu items are disabled.
  Diff styling wins over
  selection dimming for stamped edges. **Stop visualizing diff** clears overlay state; reload clears it too.
  **Mutually exclusive with the activity heatmap** — diff on pauses heat controls and restores prior heat state when cleared.
- **Activity heatmap (git metrics overlay):** when the project root is a git repo, `analyze_project`
  stamps `ModuleMetrics.churn`, `bugRisk`, and `fixCommits` for the session's lookback window
  (90 days by default, Rust `git::enrich_module_metrics`). `GraphSessionStore` owns the selected day
  count; changing it from `HeatmapLegend` reanalyzes the project and updates legend and inspector labels.
  The toolbar **View ▾** menu (`ViewMenu`) exposes a **Heatmap** checkbox + **Activity | Risk** radio items (Activity default);
  disabled without git (tooltip: “Requires a git repository”). While the heatmap is on, `HeatmapLegend`
  (passive gradient chip) renders at the canvas top-right below the level badge. `computeHeatProjection` (`heat-scores.ts`,
  pure) percentile-ranks visible modules (respecting **Hide tests**) into `heatScore`/`heatVisible` on
  projected nodes. Group scores use the **full** graph (not the L0-reduced view) so
  collapsed bird's-eye boxes match expanded L1 tints. Every module/group gets a score in
  `[0, 1]` (inactive = `0`, coldest gradient stop); brand colors are never used while the
  overlay is on. Visual stack: diff > selection > violation > heat > default chrome.
- **Line counters (opt-in):** with **View ▾ → Line counts** on (`CanvasUiState.lineCountsVisible`,
  **off by default**, kept out of `GraphSessionStore` like the other view chrome), every module and
  group box carries a quiet lower-right LOC badge
  (`LocBadge` + `formatLoc`: exact under 1000, else `1.2k` / `12k`). A module shows
  `ModuleMetrics.loc`; a group shows the **sum of its whole module tree**, so a parent includes
  nested subgroups. Totals come from `groupLocTotals(graph, visibleModuleIds)`
  (`domain/graph/Private/loc-totals.ts`, pure) computed by `GraphCanvas` over the **full** graph and
  passed as `RenderOptions.locTotals` **only while the toggle is on** (its presence is what turns the
  badges on, like `snippets` for L2) — the reduced graph has no modules under a collapsed group, so
  computing inside projection would zero every L0 card. The `visibleModuleIds` set (shared with the
  heat projection) keeps the total in step with **Hide tests**. The badge is **absolutely positioned**:
  the label/description fitters measure the box, so an in-flow counter would shift every fitted font
  size. L2 document nodes render no badge. `GroupInspection` shows the same tree total as a `LOC` row
  (modules already had one).
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
applies `projectForZoom` for manual per-group collapse at L1+. The two reductions are **separate**:
`reduceForLayout` feeds the layout engine, `reduceForView` feeds `getReducedGraph()` — a re-layout must
never publish its layout graph as the display graph, or L0 loses its group→group edge aggregation. Display/edge routing always runs
`filterTestModules` **before** `projectForZoom` so empty-group pruning never sees modules already
hidden by zoom collapse.

- `projectForZoom` (`domain/graph/Private/reduction/zoom-projection.ts`, pure): drops modules under a
  collapsed group; keeps every collapsed group box visible (nested groups are not absorbed into a
  parent); **re-routes** edges whose endpoint was hidden onto the nearest collapsed ancestor group
  box; drops self-loops, **group↔ancestor-group edges** (a group nested at any depth inside the
  other — not just the direct parent), and dedups (a violation among
  the merged edges survives). A collapsed group stays
  as a visible empty container. `projectGraph` also filters module/symbol nodes under collapsed groups
  so nothing flashes while async re-layout catches up. The store calls `syncReduced()` synchronously
  on every collapse change before emitting `zoom-changed`. `allGroupIds` = the L0 default collapse set
  (every group); `topLevelGroupIds` remains for parentless roots. `levelFromZoom(factor)` maps the
  scroll zoom factor to 0/1/1.5/2 (`<0.45 / <0.9 / <3.5 / >=3.5`). L2 exits only below
  `3.35`, providing a small hysteresis band at the source-view boundary.
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
- **Scroll drives the level, fit does not fight it:** `GraphCanvas.onMove` (with `onMoveEnd` fallback)
  → `levelFromZoom` →
  `store.setZoomLevel` (guarded against no-ops). `FitView` fits **once per mount** (= once per project
  load, since `App` renders the canvas only when `ready`) and **never refits on a level change** — a
  programmatic refit would change the zoom and feed back into another level switch (L0 → fit → L2
  oscillation). The store re-layouts on every collapse/zoom change, **seq-guarded** so a stale async
  layout from rapid scrolling never overwrites a newer one. A `LevelBadge` shows the active level.
- **Group descriptions (multi-level):** `rf-projection` threads both `descriptionShort` and
  `descriptionLong` into group node data, plus `showLong` (= `showSymbols`, i.e. L1.5+). The view shows
  progressively more prose as you zoom in:
  - **L0 (collapsed card):** `collapsedDescription` **prefers `descriptionLong`** when it fits, else
    falls back to `descriptionShort`. It measures against the largest **child-free rectangle** of the
    card, anchored below the title at the left edge: `descriptionRegion`
    (`collapsed-description-region.ts`, pure) sweeps candidate bottoms (each `childObstacles` top +
    the card bottom) and caps each candidate's width at the leftmost obstacle its rows intersect —
    so a low-left plus a high-right subgroup still leave a usable top-left gap, which independent
    `minChildY`/`minChildX` minima would falsely report as no space (obstacles are
    projection-computed from **visible** children only — a collapsed group's module boxes still
    exist in the L0 layout but are hidden, so they must never clamp the text; nested subgroup boxes
    do). The chosen region's width and font are returned and rendered
    verbatim (`collapsed-description.ts`, pure): the font prefers a counter-scaled `14 × scale`, grows
    up to a 28px screen cap when the chosen text fits, and can shrink to 8px in a narrow child-free
    column. Fit counting follows the browser's wrap opportunities at spaces and hyphens; unbreakable
    tokens such as `ParsedModule` must fit the measured width instead of being treated as hard-wrapped.
    A spacious card reads large while a tight one stays clear of its subgroup. All geometry stays in world units
    consistent with the scaled font — never an unscaled px cap, which would shrink to a sliver on
    screen at L0. The text uses the **darkened group color** (`darken(data.color)`), and its line
    clamp is derived from the region height at the chosen font and applied only
    when the selected text does not fit; complete wrapped descriptions render
    without a clamp so Chromium does not add a false trailing ellipsis.
  - **L1 (expanded):** `GroupDescription` draws `descriptionShort` **directly in the group** (no box) at
    `data.descriptionBox` (parent-relative). ELK vertically *centers* a short column, so the reserved slot
    floats mid-group with a gap under the header; **projection raises `y`** (`freeTopFor`) to the highest
    spot in the box's x-column that stays **clear of every sibling box above it** — collision-checked, not
    blindly pinned to the top (a module ELK placed up there blocks it; the box stops just below). Floored
    at the group content top (`groupPadding + groupHeaderHeight`). `textAlign: left` (React Flow's node
    default is centered). World units at `DESC_BOX.l1FontSize` (22, = `LABEL_FIT.maxFont`) — reads at the
    same scale as the module filenames, not counter-scaled. **Hovering the short text opens a custom
    tooltip with the full `descriptionLong`** (`GroupDescription.tsx` + `DescriptionTooltip.tsx`): a
    `position: fixed` div portaled to `document.body`, so it renders in screen space (unaffected by
    canvas zoom, never clipped by the node) with no OS/native-`title` length truncation; it scrolls
    internally past 60vh and flips above the cursor in the bottom half of the viewport. The `<p>` takes
    `pointerEvents: auto` only when a tooltip exists (L1 with a long description); the tooltip is
    suppressed whenever the displayed text already **is** the long one — at L1.5+ (inline long text)
    or when `descriptionLong` equals the displayed short text — and the `<p>` stays inert then.
    An open tooltip **dismisses on any viewport change** (pan or zoom): a `DismissOnViewportMove`
    child mounts only while the tooltip is open and compares the live React Flow `transform`
    against the value captured at hover, so the per-frame store subscription costs nothing
    while no tooltip is showing.
  - **L1.5+ (`showLong`):** same box shows `descriptionLong` (falls back to `descriptionShort`) at the
    smaller `DESC_BOX.fontSize` (16): the long prose is denser, so a modest font keeps the box compact
    while L1's short blurb still reads large. The two fonts are independent on purpose.
  - **L2 (`architectureDoc`):** when a group declares `architectureDoc` in its `*.group.md`
    frontmatter, the description box becomes a scrollable **rendered markdown** panel (not source).
    `MarkdownBody` parses with a **private `Marked` instance** carrying the wiki-link inline
    extension — never `marked.use` on the shared default export, which would change markdown
    rendering process-wide — and stamps `data-wiki-from` (its own path) on the rendered wrapper so
    relative `[[links]]` inside a doc resolve against that doc's directory.
    Content is lazy-fetched via `read_module_source` and cached in `GraphSessionStore.groupDocCache`;
    `GroupL2Description` + `MarkdownBody` (`marked`) render headings, lists, code, and tables with
    custom scrollbars (`L2ScrollableBody`). The scroll region is **viewport-clamped** via the shared
    `useL2ClampedLayout` hook (same as module L2 documents). Until the fetch completes, L1.5 long text still shows.
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
  zoom** (`useStore(s => s.transform[2])`, clamped 1–`MAX_COUNTER_SCALE` = 1/minZoom) so the text stays legible as you zoom out
  to L0 instead of dwindling — a *read* of the camera, which the scroll-zoom oscillation lesson permits
  (it only forbids programmatic camera *writes*). The card **title fits its card**
  (`collapsedLabelLayout`, `collapsed-description.ts`, pure): starting at the counter-scaled 15px
  base it shrinks to keep the title on one horizontal line; at the 8px screen floor it ellipsizes
  instead of wrapping vertically. The
  header chrome (toggle, gaps, icon) scales **by `font/base`, not the raw camera scale** — otherwise
  a fixed `24 × scale` toggle eats a small card before the text gets any width. When a visible nested
  subgroup is present, projection supplies every visible child rectangle (`childObstacles`). At each
  readable size the fitter considers only obstacles intersecting that title row, preserving L-shaped
  gaps that independent `minChildX`/`minChildY` values lose. The description's top offset uses the
  fitted label height. Expanded groups keep the quiet header strip, but its
  label **also counter-scales** so the group name stays legible when zoomed out — clamped at
  `expandedHeaderScale` (= 1/L0 boundary), the scale the layout's title obstacle reserves for. **Module labels do
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
  **Expanding a group also expands its collapsed ancestors** (`expandCollapsedGroupAncestors`): at L0
  every group is collapsed, so expanding a nested group alone would only swap its card for the quiet
  header and still reveal nothing (its modules stay hidden under the collapsed parent).
- **Connection disconnect affordance:** every group and module renders a plug toggle (`ConnectionToggle`, 🔌)
  at the **upper-right** corner, tagged `data-connection-toggle`. Click → `store.toggleGroupConnection` /
  `toggleModuleConnection`. Disconnected nodes stay visible; edges touching them are dropped by
  `filterDisconnectedEdges` (`domain/graph/Private/reduction/connection-filter.ts`, pure) in `GraphSessionStore.reduceForView`.
  Defaults come from `GroupNode.disconnectedByDefault` / `disconnectedModuleIds` (parsed from `*.group.md`
  `disconnected` / `disconnectedModules`); session state seeds on load and user toggles layer on top.
  Modules inherit a parent group's disconnect (ancestor chain). Inspection still lists imports on the raw graph.
- **Source preview frames (document or symbol, multi-frame):** owned by the nested deep module
  `features/graph_canvas/Private/preview_frames/` (public interface: `usePreviewFrames`, `findSymbolLine`;
  `GraphCanvas` renders `framesView` and wires `openFromSymbolNode`/`closeTransient`). Clicking an exported
  symbol node selects its parent module and opens a resizable, scrollable, **draggable** (header bar)
  frame next to the symbol, centered on the symbol's definition line (centering scrolls only the frame
  body — never `scrollIntoView`, which would scroll the window). Inside a frame, clickable identifiers
  (`hl-clickable`) come from `combinedSymbolTargets` (pure) — the union of own-module function/method
  definitions (`scanFunctionDefinitions`, a heuristic lexical scan: keyword-declared functions plus
  `name(args) {`-shaped method lines), imported exported symbols (`importedSymbolTargets` over import
  edges + `exportedSymbols`), and functions/methods scanned from imported modules' sources (methods of
  imported classes) — priority in that order on name collisions. The hook prefetches an opened frame's
  import-target sources (`sourcePrefetchIds`, store-cached) so those method names resolve. Clicking one
  opens the defining module's frame (possibly the same module, for local functions/methods) **right**
  of the clicked frame, else **below**, else **above**, else right-with-overlap
  (`placeAdjacentFrame`, pure; live DOM rects honor user resize/drag). Same module+symbol dedupes to a
  bring-to-front. Each frame exposes a pin toggle in its header; an outside click closes only unpinned
  frames, while pinned frames remain open. Clicks inside any frame (scrollbars included) close nothing;
  direct close closes that frame, and canvas move-start events close only unpinned frames. Opening a
  frame arms a one-tick close grace (`armOpenGrace` in `use-close-preview-frames`) so the opening
  gesture cannot immediately dismiss the new unpinned frame — required when a pinned frame already
  kept the outside-click listener attached. Review Note navigation preserves its
  preview during the programmatic move that centers the owning module. **Open file preview** in a module or symbol
  context menu opens the parent module at the cursor without entering L2 (menu marked
  `data-preview-keep`; close is deferred one tick so the click cannot fall through onto the canvas).
  The document frame starts at the top and composes the same preferred module description plus complete
  highlighted source as the L2 document. It retains clickable cross-module identifiers and diff rows;
  like a canvas symbol click, opening it closes other unpinned frames while preserving pinned ones.
  During **Visualize diff**, deleted modules (ghost cards and live paths in `deletedModuleIds`) resolve
  via `ghostModules` when missing from the graph; the frame body is the before-content rendered as
  all-removed rows.
- **Wiki links (`[[path]]` → a frame for any file):** a `[[target]]` or `[[target|label]]` written
  in a **comment** (or anywhere in a markdown file) renders as an `hl-wiki-link` span and opens the
  destination in a preview frame — inside frames and in **L2 canvas documents**, where the click is
  intercepted in `GraphCanvas.onNodeClick` **before** `GraphCanvasController`, so a link never
  changes selection. The destination need not be a module: `wiki_links/` resolves `./`/`../`
  against the linking file, everything else against the project root (rejecting absolute paths and
  root escapes), and falls back to a **module path suffix match** so a bare `[[store.ts]]` finds
  `src/core/store.ts`. `GraphSessionStore.fetchFileSource(path)` reads it through
  `FileSourceCache` (`read_module_source`, cached by path, failures cached as `null`; **no** Rust
  change — the command already accepts any project-relative path). A `.md` destination renders as
  **markdown** (`PreviewFrame.isMarkdown`) with a header `</>` toggle to raw source; find stays
  disabled while prose shows because match ranges cannot be applied to rendered HTML. Links inside
  rendered markdown are clickable too, so docs chain. An unreadable destination opens a frame
  carrying `loadError` instead of a body. Non-module frames key `moduleId` by path, which keeps
  `openFrame` dedupe and the clickable-symbol lookup working (the lookup resolves to nothing).
  **Section fragments** (`[[path#Section]]`, `[[#Section]]`, `[[path#Section|label]]`): split on the
  first `#` before resolution; code files mark sections with `@Section(Name)` in comments, markdown
  with ATX headings; match is case-insensitive with whitespace/hyphen normalization, first in file
  order; scroll/highlight via `PreviewFrame.activeRange` (not `symbolName`); rendered markdown also
  sets `sectionAnchor` and assigns heading `id`s for prose scroll; missing section opens at top;
  dedupe merges `activeRange`/`sectionAnchor` only when provided.
  Full sequence: `docs/flows/open-wiki-link.md`. Group L2 panel: `docs/architecture/wiki-links.md`.
- **Find in frame (Ctrl/Cmd+F):** each frame has its own find bar (header `⌕` icon, or Ctrl/Cmd+F
  targeting the focused frame first, else the hovered one; unclaimed presses fall through to the
  browser — the global project search stays on Ctrl+Shift+F). All find state is component-local in
  `use-frame-search.ts` (never the store or `usePreviewFrames`) — synchronous, no debounce/IPC.
  Matching is pure (`frame-search.ts`): case-insensitive non-overlapping substrings over the frame's
  `sourceText` plus, on document frames, the description (description matches come first in
  navigation order). Highlights render by **nesting** `hl-match`/`hl-match--active` spans *inside*
  each syntax-token span (`match-highlight.ts` `segmentTokenText` + `DiffCodeLines` `matchesByLine`
  prop) so the token span keeps its full `textContent` — `hl-clickable` navigation and `tokenClass`
  are untouched; `remove` diff rows never highlight (matches index the live source). Navigation
  (Enter / Shift+Enter / ↑↓ buttons) steps via the shared `Private/match-stepper.ts` and centers the
  active span with `centerElementInBody` (body-`scrollTop` math only). Frames are focusable
  (`tabIndex=-1`, focused on pointerdown with `preventScroll`); Escape escalates: find bar first,
  frame close second. Find-bar keys stop propagation so they never reach canvas/window shortcuts.

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

Review Notes are a frontend display overlay: after graph projection, module/group badges receive active-note counts without changing `ProjectGraph`. Badge clicks are intercepted before normal selection, collapse, or connection actions and open the Review Notes tab.
