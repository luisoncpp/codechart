---
title: Codechart — Technical Design
layout: wide
theme: clay-slate
---

# Codechart — Technical Design

```yaml
type: notice
variant: warning
icon: alert-triangle
content: |
  **Status: design / not implemented.** Lives in `docs/plans/` per the architecture-doc rule.
  When a subsystem ships, promote its section to `docs/architecture/`.
```

This is the **chosen** design, synthesized from two proposals: [`docs/plans/GPT/`](./GPT/TECHNICAL-DESIGN-AND-IMPLEMENTATION-PLAN.md) and [`docs/plans/CLAUDE/`](./CLAUDE/TECHNICAL-DESIGN.md). Read alongside the product spec [`docs/specs/DESIGN.md`](../specs/DESIGN.md) and the companion [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md).

---

## 0. Locked decisions

```yaml
type: data-grid
columns:
  - "#"
  - Decision
  - Rationale
  - Cost if wrong
rows:
  - ["D1", "**Frontend: React + React Flow + ELK** in a Tauri WebView", "Matches guidelines (`.tsx`, hooks-as-adapters), the sample aesthetic; gives nodes/edges/pan/zoom + nested constrained layout (`elkjs`).", "Beyond ~5–10k nodes React Flow needs virtualization or a canvas/WebGPU fallback. Sits behind the `LayoutEngine` + canvas seam (§6), so swappable."]
  - ["D2", "**Analysis backend: Rust in the Tauri process**", "tree-sitter native bindings, heavy work off the UI thread, fast file IO. Emits a serialized `ProjectGraph`.", "Two languages in the repo. Mitigated: the UI depends only on the `ProjectGraph` contract (§3)."]
  - ["D3", "**MVP Milestone 1: static graph from one TS project**", "Parse → group → import-edges → render the sample look. Proves the pipeline *and* the aesthetic.", "Low — every later milestone is additive on this pipeline."]
  - ["D4", "**First language: TypeScript/TSX**, behind a `LanguageAdapter` trait", "Cleanest import/export resolution, richest tree-sitter grammar, matches the sample.", "Low — C++ is a second adapter, not a rewrite."]
  - ["D5", "**Diagnostics are first-class product data, not crashes**", "A repo with one broken import must still produce a useful graph. Partial results + a visible `Diagnostic` list.", "None — strictly more robust."]
  - ["D6", "**TS contract types generated from Rust via `ts-rs`**", "Removes hand-sync drift across the IPC boundary.", "If `ts-rs` proves limiting, fall back to a hand-mirrored type + contract test on golden JSON."]
```

### What we deliberately took from each proposal

```yaml
type: board-layout
variant: grid
columns:
  - title: "From CLAUDE"
    items:
      - "Single pure-data `ProjectGraph` crossing IPC as *the contract*"
      - "Golden-JSON North Star both test suites diff against"
      - "`ProjectSource` + `LanguageAdapter` Rust seams (former unlocks git time-travel)"
      - "`GraphSessionStore` class with a thin adapter hook"
      - "Semantic zoom as a *pure projection*"
      - "Per-phase dev-CLI checkpoints"
  - title: "From GPT"
    items:
      - "Diagnostics-as-product (D5) with partial results"
      - "Explicit parser/resolver rules + ignore defaults (§7)"
      - "Concrete `codechart.config.json` shape"
      - "`index.ts`/`Private/` deep-module folder convention"
      - "`ProjectSession` state machine + `InspectionPanel` (imported-by list)"
      - "Edge-kind table reserving dashed/soft + violation edges from day one"
```

---

## 1. Two codebases, one contract

```yaml
type: flowchart
title: "Pipeline — disk to rendered graph"
description: "The single ProjectGraph value crosses the Tauri IPC boundary. Everything above is Rust analysis; everything below is React."
viewBox: "0 0 640 470"
nodes:
  - id: disk
    type: terminal
    x: 250
    y: 12
    width: 140
    height: 40
    label: "disk (source files)"
    detail_idx: 0
  - id: source
    type: rect
    x: 40
    y: 80
    width: 230
    height: 42
    label: "ProjectSource → LanguageAdapter"
    detail_idx: 1
  - id: group
    type: rect
    x: 370
    y: 80
    width: 230
    height: 42
    label: "project_config → grouping"
    detail_idx: 2
  - id: refs
    type: rect
    x: 200
    y: 150
    width: 240
    height: 42
    label: "references → analyze_project"
    detail_idx: 3
  - id: contract
    type: diamond
    x: 230
    y: 220
    width: 180
    height: 56
    label: "ProjectGraph (serde JSON)"
    detail_idx: 4
  - id: client
    type: rect
    x: 60
    y: 310
    width: 230
    height: 42
    label: "AnalysisClient → GraphSessionStore"
    detail_idx: 5
  - id: layout
    type: rect
    x: 350
    y: 310
    width: 230
    height: 42
    label: "LayoutEngine (ELK)"
    detail_idx: 6
  - id: canvas
    type: terminal
    x: 200
    y: 390
    width: 240
    height: 42
    label: "GraphCanvas + InspectionPanel"
    detail_idx: 7
edges:
  - from: disk
    to: source
    d: "M320,52 L155,80"
  - from: disk
    to: group
    d: "M320,52 L485,80"
  - from: source
    to: refs
    d: "M155,122 L300,150"
  - from: group
    to: refs
    d: "M485,122 L340,150"
  - from: refs
    to: contract
    d: "M320,192 L320,220"
  - from: contract
    to: client
    d: "M280,276 L200,310"
  - from: contract
    to: layout
    d: "M360,276 L450,310"
  - from: client
    to: canvas
    d: "M200,352 L300,390"
  - from: layout
    to: canvas
    d: "M450,352 L350,390"
details:
  - title: "disk"
    meta: "input"
    body: "The target project's source tree on disk."
  - title: "ProjectSource → LanguageAdapter"
    meta: "Rust · seams"
    body: "Abstract file access, then per-file parse to local facts via tree-sitter."
  - title: "project_config → grouping"
    meta: "Rust"
    body: "Load codechart.config.json, assign modules to nested groups, designate facades."
  - title: "references → analyze_project"
    meta: "Rust · facade"
    body: "Resolve imports to edges, classify kinds, compose everything; partial results + diagnostics."
  - title: "ProjectGraph"
    meta: "THE CONTRACT (§3)"
    body: "Pure data, no layout coordinates. Both sides test against a golden JSON fixture."
  - title: "AnalysisClient → GraphSessionStore"
    meta: "React · seam + state"
    body: "Get a ProjectGraph (invoke or mock); hold model, layout, phase, selection, zoom."
  - title: "LayoutEngine (ELK)"
    meta: "React · seam"
    body: "ProjectGraph → positions/sizes, nested and non-overlapping. Deterministic."
  - title: "GraphCanvas + InspectionPanel"
    meta: "React · output"
    body: "React Flow rendering plus the details/imported-by surface."
```

```yaml
type: notice
variant: info
content: |
  The single **`ProjectGraph`** value crosses the boundary. Either side develops and tests in
  isolation against a **golden `ProjectGraph` JSON fixture**. The contract carries **no layout
  coordinates** — positions are the frontend's job, so layout can change without re-analyzing.
```

---

## 2. Domain model — the Hierarchical Attribute Graph

Five entities, defined once, language-agnostic.

```yaml
type: card
title: "Module"
elevation: 2
tags:
  - node
content: |
  Atomic node = one compilation unit (a `.ts/.tsx` file; later a `.cpp/.h` pair).
  Holds a stable id, path, group, `isFacade`, local metrics, and optional `annotation`.
```

```yaml
type: card
title: "Group"
elevation: 2
tags:
  - container
content: |
  Non-overlapping nested container partitioning modules into subsystems. Has a label, optional
  color, parent, ordered children, and zero-or-more designated facade modules.
```

```yaml
type: card
title: "Facade"
elevation: 2
tags:
  - designation
content: |
  *Not* a separate node: a designation on a module that is its group's public interface. At macro
  zoom, external edges to private siblings re-route to it (§8).
```

```yaml
type: card
title: "Edge"
elevation: 2
tags:
  - relation
content: |
  Directed connection with a `kind` (§2.1), an `isViolation` flag, and a `trigger`.
```

```yaml
type: card
title: "Diagnostic"
elevation: 2
tags:
  - finding
content: |
  Non-fatal analysis finding (parse error, unresolved import, config error, architecture violation)
  with a severity and an optional link to a node/edge.
```

### 2.1 Edge kinds (reserved from day one, shipped incrementally)

```yaml
type: data-grid
columns:
  - Kind
  - Render
  - Meaning
  - Ships in
rows:
  - ["`import`", "solid", "File imports another resolved source file.", "M1 (Phase 4)"]
  - ["`unresolvedImport`", "— (becomes a `Diagnostic`; optional ghost edge)", "Specifier could not resolve to a known file.", "M1 (Phase 4)"]
  - ["`soft`", "dashed", "Runtime/event/context/pub-sub relationship.", "Phase 9"]
  - ["`violation` (flag on edge)", "red, high-contrast", "Import bypasses a facade across a group boundary.", "Phase 8"]
```

```yaml
type: notice
variant: info
content: |
  `violation` is modeled as `isViolation=true` on the offending edge **plus** a linked `Diagnostic`
  (`kind:"architectureViolation"`) — so the edge renders red *and* the reason appears in the panel.
```

### 2.2 Invariants (enforced by the builder, §4 `ProjectGraphBuilder`)

```yaml
type: data-grid
columns:
  - "#"
  - Invariant
rows:
  - ["1", "Sibling groups never overlap (containment is a tree, not a DAG)."]
  - ["2", "A module belongs to exactly one group."]
  - ["3", "A group may designate multiple facades, but each facade module belongs to that group."]
  - ["4", "Every edge endpoint references an existing module id (unresolved targets are diagnostics, not edges)."]
  - ["5", "Ids are stable and deterministic (§3.1) — no timestamps/random in graph data."]
```

---

## 3. The contract: `ProjectGraph`

Authoritative as Rust `serde` structs in `src-tauri/src/contract/`; the TS mirror in `src/domain/graph/` is **generated by `ts-rs`**. A contract test on each side parses the same golden JSON; CI fails on divergence.

```yaml
type: code-panel
tabs:
  - name: "contract.ts (generated)"
    language: typescript
    content: |
      // TS mirror (generated) — Rust structs are authoritative
      type EdgeKind = "import" | "unresolvedImport" | "soft";
      type Severity = "info" | "warning" | "error";
      type DiagnosticKind =
        | "parseError" | "unresolvedImport" | "configError" | "architectureViolation";

      interface Annotation {            // from // @Architecture(...) comment blocks
        type?: string;                  // "Facade" | "Module" | ...
        group?: string;
        descriptionShort?: string;
        descriptionLong?: string;
        icon?: string;
      }

      interface ModuleNode {
        id: string;                     // repo-relative POSIX path (stable)
        path: string;
        label: string;                  // basename for display
        language: "typescript" | "tsx";
        groupId: string | null;
        isFacade: boolean;
        metrics: { loc: number; churn?: number; complexity?: number };
        annotation?: Annotation;
      }

      interface GroupNode {
        id: string;                     // config id, else "folder:<path>"
        label: string;
        parentId: string | null;        // null = top-level (macro group)
        color?: string;
        facadeModuleIds: string[];
        annotation?: Annotation;
      }

      interface Edge {
        id: string;                     // `${source}->${target}:${kind}:${ordinal}`
        source: string;                 // moduleId
        target: string;                 // moduleId
        kind: EdgeKind;
        trigger: string;                // "import" | "event:<token>" | "context" | ...
        isViolation: boolean;           // facade bypass across a group boundary
      }

      interface Diagnostic {
        id: string;
        severity: Severity;
        kind: DiagnosticKind;
        message: string;
        moduleId?: string;
        edgeId?: string;
        unresolvedTarget?: string;      // raw specifier, for unresolvedImport
      }

      interface ProjectGraph {
        version: number;                // bumped on breaking contract change
        root: string;                   // project root path
        groups: GroupNode[];
        modules: ModuleNode[];
        edges: Edge[];
        diagnostics: Diagnostic[];
      }
```

```yaml
type: notice
variant: success
content: |
  This object is **pure data** — no behavior, no Tauri/React imports. That is what lets analysis,
  layout, and rendering evolve independently.
```

### 3.1 Stable id rules

```yaml
type: data-grid
columns:
  - Id
  - Rule
rows:
  - ["**Module id**", "normalized repo-relative path, `/` separators (works on Windows)."]
  - ["**Group id**", "configured group id, else `folder:<normalized-folder-path>`."]
  - ["**Edge id**", "`${sourceId}->${targetId}:${kind}:${ordinal}`."]
  - ["**Diagnostic id**", "deterministic when tied to a module/edge; generated only for global failures."]
```

---

## 4. Deep modules — Rust backend (`src-tauri/src/`)

Deep-module rule mapped to Rust: only `mod.rs` / named exports are `pub`; everything else is a private sibling. Pure modules take data in, return data out.

```yaml
type: data-grid
columns:
  - Module
  - Responsibility
  - Public surface
  - Pure?
  - Depends on
rows:
  - ["`contract`", "Entity types + `ProjectGraphBuilder` (enforces §2.2) + `serde` + `ts-rs` derive", "types, `ProjectGraphBuilder`", "✅", "—"]
  - ["`project_source`", "**Seam.** Abstract file access", "`trait ProjectSource`, `FsProjectSource`, `MemoryProjectSource`", "✅ (trait)", "—"]
  - ["`language_adapter`", "**Seam.** Parse one file → local facts", "`trait LanguageAdapter`, `ParsedModule`, `registry_for(ext)`", "✅", "tree-sitter"]
  - ["`language_adapter::typescript` (private)", "TS/TSX impl: imports, re-exports, exported symbols, comment ranges", "(none — only the trait)", "✅", "tree-sitter-typescript"]
  - ["`semantic_comments`", "Parse `@Architecture(...)` blocks → `Annotation`", "`parse_annotations(text)`", "✅", "—"]
  - ["`project_config`", "Load + validate `codechart.config.json`", "`ProjectConfig`, `load_config(root)`", "✅", "serde, glob"]
  - ["`grouping`", "Assign modules → nested groups, designate facades, reject overlap, fall back to folders", "`resolve_groups(files, config)`", "✅", "contract, project_config"]
  - ["`references`", "Resolve imports → edges; classify kind; pair emit/listen tokens; flag drift", "`resolve_references(parsed, groups)`", "✅", "contract"]
  - ["`diagnostics`", "Normalize warnings/errors into `Diagnostic`s", "`DiagnosticSink`", "✅", "contract"]
  - ["`analysis`", "**Facade.** Compose the above; partial results on per-file failure", "`analyze_project(source, config) -> ProjectGraph`", "✅", "all the above"]
  - ["`tauri_api`", "Tauri command handlers; thin glue; errors → serializable `ApiError`", "`#[tauri::command] analyze_project(req)`", "❌", "analysis"]
  - ["`bin/codechart-cli`", "Dev CLI: `parse` / `groups` / `analyze` subcommands", "—", "❌", "analysis"]
```

```yaml
type: notice
variant: warning
content: |
  **Partial-results discipline:** a failing file becomes a `parseError` diagnostic and is omitted
  from modules — the rest of the graph still builds. `analysis` is the deep module the IPC layer and
  CLI see; resolvers/adapters are sub-modules behind it.
```

---

## 5. Deep modules — React frontend (`src/`)

Each deep module is a folder with `index.ts` (public interface) and a `Private/` folder (implementation). External code imports only the nearest `index.ts`.

```yaml
type: data-grid
columns:
  - Module
  - Responsibility
  - Public surface
  - Notes
rows:
  - ["`domain/graph`", "Generated contract types + `GraphProjector` (→ React Flow models) + selectors + contract test", "types, `GraphProjector`, selectors", "No analysis; pure projection"]
  - ["`domain/layout`", "**Seam.** `ProjectGraph` → `LayoutedGraph`, nested + non-overlapping", "`interface LayoutEngine`, `ElkLayoutEngine`", "Deterministic; ELK details private"]
  - ["`ipc/analysis-client`", "**Seam.** Get a `ProjectGraph` for a project", "`interface AnalysisClient`, `TauriAnalysisClient`, `MockAnalysisClient`", "Mock runs the whole UI with zero Rust"]
  - ["`state/graph-session`", "App state as a **class** (classes over hooks)", "`GraphSessionStore` (EventEmitter) + `useGraphSession`", "Holds model, layout, phase, selection, zoom, config path"]
  - ["`features/graph_canvas`", "React Flow rendering: custom nodes, solid/dashed/violation edges, colors, icons, semantic zoom (§8)", "`<GraphCanvas />`, `GraphCanvasController`", "The only React-Flow-aware module"]
  - ["`features/inspection_panel`", "Details for selection: path, group, facade status, imports, **imported-by**, diagnostics", "`<InspectionPanel />`", "Makes the graph explain itself"]
  - ["`features/project_loader`", "Folder picker + session states", "`<ProjectLoaderPanel />`", "Drives `GraphSessionStore`"]
  - ["`app`", "Composition root: wires client → store → canvas + panels", "`<App />`", "Thin"]
```

### 5.1 Key class: `GraphSessionStore`

```yaml
type: card
title: "`GraphSessionStore` — state as a class, not hooks"
elevation: 3
tags:
  - state
  - EventEmitter
content: |
  **Owns:** current `ProjectGraph`, computed `LayoutedGraph`, **session phase**
  (`idle | loading | ready | failed | empty`), `zoomLevel (0|1|2)`, `selection`, config path.

  **Emits:** `session-changed`, `model-changed`, `layout-changed`, `selection-changed`, `zoom-changed`.

  **Methods:** `loadProject(path)`, `setZoomLevel(n)`, `select(id)`, `expandGroup(id)`/`collapseGroup(id)`.

  **Why a class:** derivation is explicit and free of React side effects; `useGraphSession` is a 1:1
  adapter that subscribes to events and triggers re-render. No business logic in hooks (per guidelines).
```

---

## 6. Main seams (where the system bends without breaking)

```yaml
type: data-grid
columns:
  - Seam
  - Type
  - Swap enables
rows:
  - ["**`ProjectGraph`** (IPC contract)", "serde JSON ↔ generated TS", "Analysis + rendering evolve independently; golden fixture drives both"]
  - ["**`ProjectSource`** (Rust trait)", "FS ↔ in-memory", "Headless analysis tests; later a **git-revision source** for time-travel"]
  - ["**`LanguageAdapter`** (Rust trait)", "TS ↔ C++ ↔ …", "New languages = new impl, no pipeline change"]
  - ["**`AnalysisClient`** (TS interface)", "Tauri `invoke` ↔ mock", "Full UI dev against golden fixtures, no backend"]
  - ["**`LayoutEngine`** (TS interface)", "ELK ↔ custom", "Swap layout algorithm; later a WebGPU path"]
  - ["**`GraphSessionStore`** (TS class)", "logic ↔ React", "Unit-test all state transitions without a DOM"]
  - ["**Edge `kind` / `isViolation`**", "data", "Solid imports ship first; soft/violation edges are additive analyzers, no contract change"]
```

---

## 7. Parser, resolver & config rules

```yaml
type: card
title: "Parser (TS adapter) must handle"
elevation: 2
content: |
  `import X from "m"`, `import { a } from "m"`, `import * as ns from "m"`,
  `import type { T } from "./t"`, side-effect `import "./setup"`, and re-exports
  (`export { x } from "./y"`) — re-exports may slip to Phase 2 if cheap.
```

```yaml
type: card
title: "Resolver must handle"
elevation: 2
content: |
  Relative imports only for MVP edges; extensionless `.ts`/`.tsx`; explicit `.ts`/`.tsx`;
  `index.ts`/`index.tsx`. Non-relative package imports become *external metadata*, not graph nodes.
  An unresolvable relative import becomes an `unresolvedImport` diagnostic.
```

```yaml
type: notice
variant: info
content: |
  **Ignore defaults:** `.git/**`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `coverage/**`.
  The analyzer works with **no config** (folder inference) and improves with it.
```

```yaml
type: code-panel
tabs:
  - name: "codechart.config.json"
    language: json
    content: |
      {
        "groups": [
          { "id": "frontend", "label": "Frontend", "color": "blue",
            "match": ["src/**"], "facades": ["src/index.ts"] }
        ],
        "ignore": ["node_modules/**", "dist/**", "build/**"]
      }
```

Match rules support globs, regex, explicit file lists, and references to other group ids.

---

## 8. Semantic zoom & facade re-routing (post-MVP, designed now)

Rendering reads `zoomLevel` and applies a **pure projection** `project(model, collapsedGroupIds)` → render model (the underlying `ProjectGraph` stays immutable per analysis run).

```yaml
type: timeline
orientation: vertical
steps:
  - timestamp: "L0"
    title: "Bird's eye"
    type: "info"
  - timestamp: "L1"
    title: "Architectural"
    type: "info"
  - timestamp: "L2"
    title: "Implementation"
    type: "recovery"
```

```yaml
type: data-grid
columns:
  - Level
  - Behavior
rows:
  - ["**L0 (bird's eye)**", "Collapse every group to its description card; **all group boxes stay visible** (including nested groups). Modules under a collapsed group disappear. Edges whose endpoint is a private module inside a collapsed group **re-route to that group's box** (nearest collapsed ancestor). **Parent↔child group edges are dropped.**"]
  - ["**L1 (architectural)**", "Expand focused groups → modules + intra-group edges visible."]
  - ["**L2 (implementation)**", "Node box renders a syntax-highlighted snippet (uses adapter source ranges already captured in `ParsedModule`)."]
```

---

## 9. Directory layout

```yaml
type: code-panel
tabs:
  - name: "src-tauri/src/ (Rust)"
    language: text
    content: |
      contract/            # types + ProjectGraphBuilder + invariants + ts-rs (source of truth)
      project_source/      # trait + Fs + Memory
      language_adapter/    # trait + registry; typescript/ (private impl)
      semantic_comments/
      project_config/      # schema / loader / matcher / validation
      grouping/
      references/
      diagnostics/
      analysis/            # analyze_project facade
      tauri_api/           # tauri commands
      bin/codechart-cli    # parse | groups | analyze dev CLI
  - name: "src/ (React)"
    language: text
    content: |
      domain/graph/        # generated types + GraphProjector + selectors + contract test
      domain/layout/       # LayoutEngine + ElkLayoutEngine
      ipc/analysis-client/ # interface + Tauri + Mock
      state/graph-session/
      features/graph_canvas/
      features/inspection_panel/
      features/project_loader/
      app/
  - name: "tests/fixtures/"
    language: text
    content: |
      ts-basic-project/           # small reference TS project (the test subject)
      golden/project-graph.json   # hand-authored expected output (the North Star data)
```

---

## 10. Cross-cutting concerns

```yaml
type: card
title: "Determinism"
elevation: 1
content: |
  Analysis and layout must be deterministic (sorted iteration, path-derived ids) so golden-fixture
  diffs and layout snapshots are meaningful.
```

```yaml
type: card
title: "Annotations degrade gracefully"
elevation: 1
content: |
  Missing `@Architecture` comments don't break the graph — it still builds from imports + config alone.
```

```yaml
type: card
title: "Drift detection"
elevation: 1
content: |
  Lives entirely in `references`: an edge crossing a macro-group boundary into a non-facade module
  sets `isViolation=true` and emits an `architectureViolation` diagnostic. No separate subsystem.
```

```yaml
type: card
title: "Performance posture (MVP)"
elevation: 1
content: |
  React Flow handles low-thousands of nodes; L0 collapse keeps the visible set small.
  Virtualization / WebGPU is a later milestone behind the `LayoutEngine` + canvas seam.
```

---

## 11. Out of scope for MVP M1 (additive later, every item maps to a seam)

```yaml
type: data-grid
columns:
  - Feature (spec ref)
  - Seam it extends
rows:
  - ["Architecture drift / red violation edges (§3.1)", "`references` (flag + diagnostic) — Phase 8, near-term"]
  - ["Dashed/soft edges: events, context, pub/sub (§2.4)", "`references` (new classifier) — Phase 9"]
  - ["Semantic zoom L0/L1/L2 (§3.3)", "pure `project()` in `graph_canvas` — Phase 10"]
  - ["Narrative diff visualizer (§3.4)", "diff input to `analyze_project` + render overlay"]
  - ["Git time-travel (§3.5)", "new `ProjectSource` over git revisions"]
  - ["Activity heatmaps (§3.5)", "extra `ModuleNode.metrics` + render layer"]
  - ["Global symbol resolution / LSP / stack-graphs", "upgrade inside `references`"]
  - ["C++ support", "new `LanguageAdapter` impl"]
  - ["Embedded markdown reader (§3.2)", "new panel beside `GraphCanvas`"]
  - ["Million-node WebGPU rendering", "new `LayoutEngine` + renderer behind existing seams"]
```
