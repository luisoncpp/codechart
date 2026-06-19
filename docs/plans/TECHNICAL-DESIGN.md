# Codechart — Technical Design (canonical)

> **Status: design / not implemented.** Lives in `docs/plans/` per the architecture-doc rule.
> When a subsystem ships, promote its section to `docs/architecture/`.
>
> This is the **chosen** design, synthesized from the two proposals in
> [`docs/plans/GPT/`](./GPT/TECHNICAL-DESIGN-AND-IMPLEMENTATION-PLAN.md) and
> [`docs/plans/CLAUDE/`](./CLAUDE/TECHNICAL-DESIGN.md). Read alongside the product spec
> [`docs/specs/DESIGN.md`](../specs/DESIGN.md) and the companion
> [`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md).

---

## 0. Locked decisions

| # | Decision | Rationale | Cost if wrong |
|---|----------|-----------|---------------|
| D1 | **Frontend: React + React Flow + ELK** in a Tauri WebView | Matches guidelines (`.tsx`, hooks-as-adapters), the sample aesthetic, and gives nodes/edges/pan/zoom + nested constrained layout (`elkjs`). | Beyond ~5–10k nodes React Flow needs virtualization or a canvas/WebGPU fallback. Renderer sits behind the `LayoutEngine` + canvas seam (§6) so it is swappable. |
| D2 | **Analysis backend: Rust in the Tauri process** | tree-sitter native bindings, heavy work off the UI thread, fast file IO. Emits a serialized `ProjectGraph`. | Two languages in the repo. Mitigated: the UI depends only on the `ProjectGraph` contract (§3), never on Rust internals. |
| D3 | **MVP Milestone 1: static graph from one TS project** | Parse → group → import-edges → render the sample look. Proves the whole pipeline *and* the aesthetic before semantic features. | Low — every later milestone is additive on this pipeline. |
| D4 | **First language: TypeScript/TSX**, behind a `LanguageAdapter` trait | Cleanest import/export resolution, richest tree-sitter grammar, matches the sample. | Low — C++ is a second adapter, not a rewrite. |
| D5 | **Diagnostics are first-class product data, not crashes** | A repo with one broken import must still produce a useful graph. Partial results + a visible `Diagnostic` list (adopted from the GPT proposal). | None — strictly more robust. |
| D6 | **TS contract types are generated from Rust via `ts-rs`** | Removes hand-sync drift between the two sides of the IPC boundary. | If `ts-rs` proves limiting, fall back to a hand-mirrored type + a contract test on the golden JSON (the test exists regardless). |

### What we deliberately took from each proposal

- **From CLAUDE:** the single pure-data `ProjectGraph` crossing IPC as *the contract*; the
  golden-JSON North Star that both test suites diff against; the `ProjectSource` and
  `LanguageAdapter` Rust seams (the former also unlocks future git time-travel); the
  `GraphSessionStore` class with a thin adapter hook; semantic zoom as a *pure projection*;
  per-phase dev-CLI checkpoints.
- **From GPT:** diagnostics-as-product (D5) with partial results; explicit parser/resolver
  rules and ignore defaults (§7); the concrete `codechart.config.json` shape; the
  `index.ts`/`Private/` deep-module folder convention; the `ProjectSession` state machine and
  the `InspectionPanel` (imported-by list); the edge-kind table that reserves dashed/soft and
  violation edges from day one.

---

## 1. Two codebases, one contract

```
        ┌──────────────────────── Tauri process (Rust) ────────────────────────┐
 disk ─▶│ ProjectSource ─▶ LanguageAdapter ─▶ semantic_comments                  │
        │ project_config ─▶ grouping ─┐                                          │
        │                             ├─▶ references ─▶ analysis::analyze_project │
        │            (parsed modules + group tree)        (+ diagnostics)        │
        └──────────────────────────────────────────────────────────────────────┼─┐
                                                                                 │ │ Tauri IPC
                       ProjectGraph (serde JSON)  ◀── THE CONTRACT (§3) ──────────▶│ │
                                                                                 │ │
        ┌──────────────────────── WebView (React/TS) ────────────────────────────┼─┘
        │ AnalysisClient (invoke | mock) ─▶ GraphSessionStore ─▶ LayoutEngine(ELK) │
        │                                          └─▶ GraphCanvas + InspectionPanel│
        └──────────────────────────────────────────────────────────────────────────┘
```

The single **`ProjectGraph`** value crosses the boundary. Everything upstream is Rust analysis;
everything downstream is React. Either side develops and tests in isolation against a **golden
`ProjectGraph` JSON fixture**. The contract carries **no layout coordinates** — positions are the
frontend's job (so layout can change without re-analyzing).

---

## 2. Domain model — the Hierarchical Attribute Graph

Five entities, defined once, language-agnostic.

- **Module** — atomic node = one compilation unit (a `.ts/.tsx` file; later a `.cpp/.h` pair).
  Holds a stable id, path, group, `isFacade`, local metrics, and optional `annotation`.
- **Group** — non-overlapping nested container partitioning modules into subsystems. Has a label,
  optional color, parent, ordered children, and zero-or-more designated facade modules.
- **Facade** — *not* a separate node: a designation on a module that is its group's public
  interface. At macro zoom, external edges to private siblings re-route to it (§8).
- **Edge** — directed connection with a `kind` (§2.1), an `isViolation` flag, and a `trigger`.
- **Diagnostic** — a non-fatal analysis finding (parse error, unresolved import, config error,
  architecture violation) with a severity and an optional link to a node/edge.

### 2.1 Edge kinds (reserved from day one, shipped incrementally)

| Kind | Render | Meaning | Ships in |
|------|--------|---------|----------|
| `import` | solid | File imports another resolved source file. | M1 (Phase 4) |
| `unresolvedImport` | — (becomes a `Diagnostic`; optional ghost edge) | Specifier could not resolve to a known file. | M1 (Phase 4) |
| `soft` | dashed | Runtime/event/context/pub-sub relationship. | Phase 9 |
| `violation` (via `isViolation` flag on an edge) | red, high-contrast | Import bypasses a facade across a group boundary. | Phase 8 |

`violation` is modeled as `isViolation=true` on the offending edge **plus** a linked `Diagnostic`
(`kind:"architectureViolation"`) — so the edge renders red *and* the reason appears in the panel.

### 2.2 Invariants (enforced by the builder, §4 `ProjectGraphBuilder`)

1. Sibling groups never overlap (containment is a tree, not a DAG).
2. A module belongs to exactly one group.
3. A group may designate multiple facades, but each facade module belongs to that group.
4. Every edge endpoint references an existing module id (unresolved targets are diagnostics, not edges).
5. Ids are stable and deterministic (§3.1) — no timestamps/random in graph data.

---

## 3. The contract: `ProjectGraph`

Authoritative as Rust `serde` structs in `src-tauri/src/contract/`; the TS mirror in
`src/domain/graph/` is **generated by `ts-rs`**. A contract test on each side parses the same
golden JSON; CI fails on divergence.

```ts
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

This object is **pure data** — no behavior, no Tauri/React imports. That is what lets analysis,
layout, and rendering evolve independently.

### 3.1 Stable id rules

- **Module id:** normalized repo-relative path, `/` separators (works on Windows).
- **Group id:** configured group id, else `folder:<normalized-folder-path>`.
- **Edge id:** `${sourceId}->${targetId}:${kind}:${ordinal}`.
- **Diagnostic id:** deterministic when tied to a module/edge; generated only for global failures.

---

## 4. Deep modules — Rust backend (`src-tauri/src/`)

Deep-module rule mapped to Rust: only `mod.rs` / named exports are `pub`; everything else is a
private sibling. Pure modules take data in, return data out.

| Module | Responsibility | Public surface | Pure? | Depends on |
|--------|----------------|----------------|-------|------------|
| `contract` | Entity types + `ProjectGraphBuilder` (enforces §2.2) + `serde` + `ts-rs` derive | types, `ProjectGraphBuilder` | ✅ | — |
| `project_source` | **Seam.** Abstract file access | `trait ProjectSource`, `FsProjectSource`, `MemoryProjectSource` (tests) | ✅ (trait) | — |
| `language_adapter` | **Seam.** Parse one file → local facts | `trait LanguageAdapter`, `ParsedModule`, `registry_for(ext)` | ✅ | tree-sitter |
| `language_adapter::typescript` (private) | TS/TSX impl: imports, re-exports, exported symbols, comment ranges | (none — only the trait) | ✅ | tree-sitter-typescript |
| `semantic_comments` | Parse `@Architecture(...)` blocks → `Annotation` | `parse_annotations(text)` | ✅ | — |
| `project_config` | Load + validate `codechart.config.json` (schema/loader/matcher/validation private) | `ProjectConfig`, `load_config(root)` | ✅ | serde, glob |
| `grouping` | Assign modules → nested groups, designate facades, reject sibling overlap, fall back to folder inference | `resolve_groups(files, config)` | ✅ | contract, project_config |
| `references` | Resolve imports → edges; classify kind; pair emit/listen tokens; flag drift | `resolve_references(parsed, groups)` | ✅ | contract |
| `diagnostics` | Normalize warnings/errors into `Diagnostic`s | `DiagnosticSink` | ✅ | contract |
| `analysis` | **Facade.** Compose the above; partial results on per-file failure | `analyze_project(source, config) -> ProjectGraph` | ✅ | all the above |
| `tauri_api` | Tauri command handlers; thin glue; backend errors → serializable `ApiError` | `#[tauri::command] analyze_project(req)` | ❌ | analysis |
| `bin/codechart-cli` | Dev CLI: `parse` / `groups` / `analyze` subcommands print intermediate output | — | ❌ | analysis |

`analysis` is the deep module the IPC layer and CLI see; the resolvers/adapters are sub-modules
behind it. **Partial-results discipline:** a failing file becomes a `parseError` diagnostic and is
omitted from modules — the rest of the graph still builds.

---

## 5. Deep modules — React frontend (`src/`)

Folder convention: each deep module is a folder with `index.ts` (public interface) and a `Private/`
folder (implementation). External code imports only the nearest `index.ts`.

| Module | Responsibility | Public surface | Notes |
|--------|----------------|----------------|-------|
| `domain/graph` | Generated contract types + `GraphProjector` (→ React Flow models) + selectors + contract test | types, `GraphProjector`, selectors | No analysis; pure projection |
| `domain/layout` | **Seam.** `ProjectGraph` → `LayoutedGraph` (positions/sizes), nested + non-overlapping | `interface LayoutEngine`, `ElkLayoutEngine` | Deterministic for a given graph; ELK details stay private |
| `ipc/analysis-client` | **Seam.** Get a `ProjectGraph` for a project | `interface AnalysisClient`, `TauriAnalysisClient`, `MockAnalysisClient` (fixtures) | Mock runs the whole UI with zero Rust |
| `state/graph-session` | App state as a **class** (guidelines: classes over hooks) | `GraphSessionStore` (EventEmitter) + `useGraphSession` adapter | Holds model, layout, session phase, selection, zoom, config path |
| `features/graph_canvas` | React Flow rendering: custom group/module/facade nodes, solid/dashed/violation edges, colors, icons, semantic zoom (§8) | `<GraphCanvas />`, `GraphCanvasController` | The only React-Flow-aware module |
| `features/inspection_panel` | Details for the selection: path, group, facade status, imports, **imported-by**, diagnostics, metadata | `<InspectionPanel />` | UX surface that makes the graph explain itself |
| `features/project_loader` | Folder picker + session states (idle/loading/ready/failed/empty) | `<ProjectLoaderPanel />` | Drives `GraphSessionStore` |
| `app` | Composition root: wires client → store → canvas + panels | `<App />` | Thin |

### 5.1 Key class: `GraphSessionStore`

- **Owns:** current `ProjectGraph`, computed `LayoutedGraph`, **session phase**
  (`idle | loading | ready | failed | empty`), `zoomLevel (0|1|2)`, `selection`, config path.
- **Emits:** `session-changed`, `model-changed`, `layout-changed`, `selection-changed`, `zoom-changed`.
- **Methods:** `loadProject(path)`, `setZoomLevel(n)`, `select(id)`, `expandGroup(id)`/`collapseGroup(id)`.
- **Why a class:** derivation is explicit and free of React side effects; `useGraphSession` is a 1:1
  adapter that subscribes to events and triggers re-render. No business logic in hooks (per guidelines).

---

## 6. Main seams (where the system bends without breaking)

| Seam | Type | Swap enables |
|------|------|--------------|
| **`ProjectGraph`** (IPC contract) | serde JSON ↔ generated TS | Analysis and rendering evolve independently; golden fixture drives both |
| **`ProjectSource`** (Rust trait) | FS ↔ in-memory | Headless analysis tests; later a **git-revision source** for time-travel |
| **`LanguageAdapter`** (Rust trait) | TS ↔ C++ ↔ … | New languages = new impl, no pipeline change |
| **`AnalysisClient`** (TS interface) | Tauri `invoke` ↔ mock | Full UI dev against golden fixtures, no backend |
| **`LayoutEngine`** (TS interface) | ELK ↔ custom | Swap layout algorithm; later a WebGPU path |
| **`GraphSessionStore`** (TS class) | logic ↔ React | Unit-test all state transitions without a DOM |
| **Edge `kind` / `isViolation`** | data | Solid imports ship first; soft/violation edges are additive analyzers, no contract change |

---

## 7. Parser, resolver & config rules (concrete, from the GPT proposal)

**Parser (TS adapter) must handle:** `import X from "m"`, `import { a } from "m"`,
`import * as ns from "m"`, `import type { T } from "./t"`, side-effect `import "./setup"`, and
re-exports (`export { x } from "./y"`) — re-exports may slip to Phase 2 if cheap.

**Resolver must handle:** relative imports only for MVP edges; extensionless `.ts`/`.tsx`; explicit
`.ts`/`.tsx`; `index.ts`/`index.tsx`. Non-relative package imports become *external metadata*, not
graph nodes. An unresolvable relative import becomes an `unresolvedImport` diagnostic.

**Ignore defaults:** `.git/**`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `coverage/**`.

**Config (`codechart.config.json`, optional):** the analyzer works with no config (folder
inference) and improves with it.

```json
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

Rendering reads `zoomLevel` and applies a **pure projection** `project(model, collapsedGroupIds)`
→ render model (the underlying `ProjectGraph` stays immutable per analysis run):

- **L0 (bird's eye):** render only top-level groups; collapse each to its facade(s). Edges whose
  endpoint is a private module inside a collapsed group **re-route to that group's facade**.
- **L1 (architectural):** expand focused groups → modules + intra-group edges visible.
- **L2 (implementation):** node box renders a syntax-highlighted snippet (uses adapter source ranges
  already captured in `ParsedModule`).

---

## 9. Directory layout

```
src-tauri/src/
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
src/
  domain/graph/        # generated types + GraphProjector + selectors + contract test
  domain/layout/       # LayoutEngine + ElkLayoutEngine
  ipc/analysis-client/ # interface + Tauri + Mock
  state/graph-session/
  features/graph_canvas/
  features/inspection_panel/
  features/project_loader/
  app/
tests/fixtures/
  ts-basic-project/        # small reference TS project (the test subject)
  golden/project-graph.json   # hand-authored expected output (the North Star data)
```

---

## 10. Cross-cutting concerns

- **Determinism:** analysis and layout must be deterministic (sorted iteration, path-derived ids) so
  golden-fixture diffs and layout snapshots are meaningful.
- **Annotations degrade gracefully:** missing `@Architecture` comments don't break the graph — it
  still builds from imports + config alone.
- **Drift detection** lives entirely in `references`: an edge crossing a macro-group boundary into a
  non-facade module sets `isViolation=true` and emits an `architectureViolation` diagnostic. No
  separate subsystem.
- **Performance posture (MVP):** React Flow handles low-thousands of nodes; L0 collapse keeps the
  visible set small. Virtualization / WebGPU is a later milestone behind the `LayoutEngine` + canvas
  seam — not built now, not blocked.

---

## 11. Out of scope for MVP M1 (additive later, every item maps to a seam)

| Feature (spec ref) | Seam it extends |
|--------------------|-----------------|
| Architecture drift / red violation edges (§3.1) | `references` (flag + diagnostic) — Phase 8, near-term |
| Dashed/soft edges: events, context, pub/sub (§2.4) | `references` (new classifier) — Phase 9 |
| Semantic zoom L0/L1/L2 (§3.3) | pure `project()` in `graph_canvas` — Phase 10 |
| Narrative diff visualizer (§3.4) | diff input to `analyze_project` + render overlay |
| Git time-travel (§3.5) | new `ProjectSource` over git revisions |
| Activity heatmaps (§3.5) | extra `ModuleNode.metrics` + render layer |
| Global symbol resolution / LSP / stack-graphs | upgrade inside `references` |
| C++ support | new `LanguageAdapter` impl |
| Embedded markdown reader (§3.2) | new panel beside `GraphCanvas` |
| Million-node WebGPU rendering | new `LayoutEngine` + renderer behind existing seams |
