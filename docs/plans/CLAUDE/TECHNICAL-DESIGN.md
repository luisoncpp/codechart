# Technical Design: Trama Vision (codechart)

Detailed engineering design for the MVP and the seams that keep later milestones cheap.
Read alongside [`docs/specs/DESIGN.md`](../specs/DESIGN.md) (the product spec) and
[`IMPLEMENTATION-PLAN.md`](./IMPLEMENTATION-PLAN.md) (phasing, tests, checkpoints).

> Status: **design / not implemented**. This lives in `docs/plans/` per the architecture-doc rule.
> When a subsystem ships, promote its section to `docs/architecture/`.

---

## 0. Decisions (locked, revisitable)

| # | Decision | Rationale | Cost if wrong |
|---|----------|-----------|---------------|
| D1 | **Frontend: React + React Flow + ELK** inside a Tauri shell | Matches project guidelines (`.tsx`, hooks-as-adapters, Context) and the sample diagram aesthetic. React Flow gives nodes/edges/pan/zoom; `elkjs` gives nested constrained layout. | At ~10k+ nodes React Flow needs virtualization or a canvas/WebGPU fallback (see §9). Renderer sits behind a seam (§6) so it can be swapped. |
| D2 | **Analysis backend: Rust in the Tauri process** | Tree-sitter native bindings, heavy work off the UI thread, fast file IO. Emits a serialized `GraphModel` over IPC. | Two languages in the repo. Mitigated: analysis output is plain data; the UI never depends on Rust internals, only on the `GraphModel` contract (§3). |
| D3 | **MVP slice: static nested graph from one TS project** | Parse → group → seams → render the sample look. No diff/time-travel/LSP yet. Proves the core pipeline *and* the aesthetic before adding features. | Low — every later milestone is additive on this pipeline. |
| D4 | **First language: TypeScript/TSX**, behind a `LanguageAdapter` trait | Cleanest import/export resolution, richest tree-sitter grammar, matches the sample. | Low — C++ (`.cpp/.h`) is a second adapter implementation, not a rewrite. |

---

## 1. Two codebases, one contract

```
            ┌──────────────────────────── Tauri process (Rust) ────────────────────────────┐
 disk ─────▶│ ProjectSource ─▶ LanguageAdapter ─▶ semantic_comments                          │
            │                          │                                                      │
 config ───▶│ group_config ─▶ group_resolver ─┐                                               │
            │                                 ├─▶ reference_resolver ─▶ analysis::pipeline ──┐ │
            │                       (parsed modules + group tree)                            │ │
            └──────────────────────────────────────────────────────────────────────────────┼─┘
                                                                                             │
                                            GraphModel (serde JSON)  ◀── THE CONTRACT (§3) ──▶│ Tauri IPC
                                                                                             │
            ┌──────────────────────────── WebView (React/TS) ───────────────────────────────┼─┐
            │ AnalysisClient (invoke | mock) ─▶ GraphSessionStore ─▶ elk-layout ─▶ GraphCanvas │ │
            └────────────────────────────────────────────────────────────────────────────────┘
```

The single **`GraphModel`** value crosses the IPC boundary. Everything upstream of it is Rust
analysis; everything downstream is React rendering. Either side can be developed and tested in
isolation against a **golden `GraphModel` JSON fixture** (see plan §"Verification toolkit").

---

## 2. Domain model (the graph taxonomy)

From the spec — a *Hierarchical Attribute Graph*. Four entities, defined once, language-agnostic:

- **Module** — atomic node = one compilation unit (a `.ts/.tsx` file; later a `.cpp/.h` pair). Holds
  an id, path, local metrics, semantic annotations, and `isFacade`.
- **Group** — non-overlapping nested container partitioning modules into subsystems. Has matching
  rules, ordered children (modules and sub-groups), and at most one designated facade module.
- **Facade** — *not* a separate node: a designation (`isFacade=true`) on a module that is its
  group's public interface. At macro zoom, external edges to private siblings re-route to it (§7).
- **Edge** — directed connection, `kind: "solid" | "dashed"`, with a `trigger` reason and an
  `isViolation` flag (architectural drift).

Invariants the model **must** enforce (checked in the builder, §4):
1. Sibling groups never overlap (tree, not DAG, for containment).
2. A module belongs to exactly one group.
3. At most one facade per group.
4. Edge endpoints reference existing module ids.

---

## 3. The contract: `GraphModel`

Defined once as Rust `serde` structs (source of truth) and mirrored in TS. A **contract test** on
each side parses the same golden JSON; CI fails if they diverge (consider `ts-rs` to generate the
TS types from Rust to remove hand-sync).

```ts
// TS mirror (src/core/graph-model) — Rust structs in src-tauri/src/graph_model are authoritative
type EdgeKind = "solid" | "dashed";

interface Annotation {            // from // @Architecture(...) comment blocks
  type?: string;                  // "Facade" | "Module" | ...
  group?: string;
  descriptionShort?: string;
  descriptionLong?: string;
  icon?: string;
}

interface ModuleNode {
  id: string;                     // stable, derived from repo-relative path
  path: string;
  groupId: string;
  isFacade: boolean;
  metrics: { loc: number; churn?: number; complexity?: number };
  annotation?: Annotation;
}

interface GroupNode {
  id: string;
  label: string;
  parentId: string | null;        // null = top-level (macro group)
  facadeModuleId: string | null;
  annotation?: Annotation;
}

interface Edge {
  id: string;
  source: string;                 // moduleId
  target: string;                 // moduleId
  kind: EdgeKind;                 // solid=structural, dashed=dynamic/seam
  trigger: string;                // "import" | "include" | "event:<token>" | "context" | ...
  isViolation: boolean;           // facade bypass across group boundary
}

interface GraphModel {
  version: number;                // bumped on breaking contract change
  root: string;                   // project root path
  groups: GroupNode[];
  modules: ModuleNode[];
  edges: Edge[];
}
```

This object is **pure data** — no behavior, no Tauri/React imports. That is what lets layout,
rendering, and analysis evolve independently.

---

## 4. Deep modules — Rust backend (`src-tauri/src/`)

Each is a Rust module with a thin `pub` surface (the "index.ts" rule mapped to Rust: only the
`mod.rs`/named exports are `pub`; helpers stay private). Pure modules take data in, return data out.

| Module | Responsibility | Public surface | Pure? | Depends on |
|--------|----------------|----------------|-------|------------|
| `graph_model` | Entity types + `GraphModelBuilder` enforcing the §2 invariants + serde | types, `GraphModelBuilder` | ✅ | — |
| `project_source` | **Seam.** Abstract file access | `trait ProjectSource { list_files, read_file }`, `FsProjectSource`, `MemoryProjectSource` (tests) | ✅ (trait) | — |
| `language_adapter` | **Seam.** Parse one file → local facts | `trait LanguageAdapter`, `ParsedModule`, `registry_for(ext)` | ✅ | tree-sitter |
| `language_adapter::typescript` (Private) | TS/TSX impl: imports, exports, symbols, raw comment ranges | (none — only the trait) | ✅ | tree-sitter-typescript |
| `semantic_comments` | Parse `@Architecture(...)` blocks → `Annotation` | `parse_annotations(text)` | ✅ | — |
| `group_config` | Load + validate JSON/YAML rules (globs / regex / file lists / group refs) | `GroupConfig`, `load_config` | ✅ | serde, glob |
| `group_resolver` | Assign modules → nested groups, designate facades, reject sibling overlap | `resolve_groups(files, config)` | ✅ | graph_model, group_config |
| `reference_resolver` | Resolve imports→edges; classify solid vs dashed; pair emit/listen tokens; flag drift | `resolve_references(parsed, groups)` | ✅ | graph_model |
| `analysis` | **Facade.** Compose the above into one call | `analyze_project(source, config) -> GraphModel` | ✅ | all the above |
| `ipc` | Tauri command handlers; thin glue calling `analysis` | `#[tauri::command] analyze(path, config)` | ❌ | analysis |

`analysis` is the deep module the IPC layer sees; the resolvers/adapters are sub-modules behind it.

---

## 5. Deep modules — React frontend (`src/`)

| Module | Responsibility | Public surface | Notes |
|--------|----------------|----------------|-------|
| `core/graph-model` | TS mirror of the contract + contract test | types only | No logic; just the shape |
| `ipc/analysis-client` | **Seam.** Get a `GraphModel` for a project | `interface AnalysisClient`, `TauriAnalysisClient`, `MockAnalysisClient` (fixtures) | Mock lets the whole UI run with zero Rust |
| `layout/elk-layout` | **Seam.** `GraphModel` → `LayoutResult` (positions/sizes), nested + non-overlapping | `interface LayoutEngine`, `ElkLayoutEngine` | Deterministic given the same model |
| `state/graph-session` | App state as a **class** (per guidelines: classes over hooks) | `GraphSessionStore` (EventEmitter) + `useGraphSession` adapter hook | Holds model, layout, selection, zoom level, config path |
| `render/graph-canvas` | React Flow rendering: custom group/module/facade nodes, solid/dashed edges, colors/icons, semantic zoom (§7) | `<GraphCanvas />` | The only React-Flow-aware module |
| `app` | Composition root: wires client → store → canvas | `<App />` | Thin |

### Key class: `GraphSessionStore`
- **Owns:** current `GraphModel`, computed `LayoutResult`, `zoomLevel (0|1|2)`, `selection`, config path.
- **Emits:** `model-changed`, `layout-changed`, `selection-changed`, `zoom-changed`.
- **Methods:** `loadProject(path)`, `setZoomLevel(n)`, `select(id)`, `expandGroup(id)` / `collapseGroup(id)`.
- **Why a class:** keeps derivation explicit and side-effect-free of React; the hook is a 1:1 adapter
  that subscribes to events and triggers re-render. No business logic in hooks.

---

## 6. Main seams (where the system bends without breaking)

| Seam | Type | Swap enables |
|------|------|--------------|
| **`GraphModel` (IPC contract)** | serde JSON ↔ TS types | Analysis and rendering evolve independently; fixtures drive both sides (§verification) |
| **`ProjectSource`** (Rust trait) | FS ↔ in-memory | Headless analysis tests with virtual file trees; later: git-revision source for time-travel |
| **`LanguageAdapter`** (Rust trait) | TS ↔ C++ ↔ … | New languages = new impl, no pipeline changes |
| **`AnalysisClient`** (TS interface) | Tauri `invoke` ↔ mock | Full UI/Storybook dev against golden fixtures with no backend |
| **`LayoutEngine`** (TS interface) | ELK ↔ custom | Swap layout algorithm; later WebGPU path |
| **`GraphSessionStore`** (TS class) | logic ↔ React | Unit-test all state transitions without a DOM |

---

## 7. Semantic zoom & facade re-routing (post-MVP, designed now)

Rendering reads `zoomLevel` from the store and chooses a level-of-detail projection of the same model:

- **L0 (Bird's eye):** collapse every group to its description card; all group boxes stay visible
  (including nested groups). Edges whose endpoint is a private module inside a collapsed group
  **re-route to that group's box** (nearest collapsed ancestor). This is a pure projection function
  `project(model, collapsedGroupIds)` → render model — unit-testable.
- **L1 (Architectural):** expand focused groups → modules + intra-group edges visible.
- **L2 (Implementation):** node bounding box renders a syntax-highlighted snippet (deferred — needs the
  adapter to return source ranges, already in `ParsedModule`).

Designed as a **projection**, not mutation, so the underlying `GraphModel` is immutable per analysis run.

---

## 8. Directory layout

```
src-tauri/src/
  graph_model/         # types + builder + invariants (contract source of truth)
  project_source/      # trait + Fs + Memory
  language_adapter/    # trait + registry; typescript/ (private impl)
  semantic_comments/
  group_config/
  group_resolver/
  reference_resolver/
  analysis/            # analyze_project facade
  ipc/                 # tauri commands
src/
  core/graph-model/    # TS mirror + contract test
  ipc/analysis-client/ # interface + Tauri + Mock
  layout/elk-layout/
  state/graph-session/
  render/graph-canvas/
  app/
fixtures/
  sample-project/      # small reference TS project (the test subject)
  golden/graph-model.json   # hand-authored expected output (the North Star data)
```

---

## 9. Cross-cutting concerns

- **Performance posture (MVP):** React Flow handles low-thousands of nodes; semantic zoom (L0 collapse)
  keeps the visible set small. Virtualization / WebGPU is a *later* milestone behind the `LayoutEngine`
  + renderer seam — not built now, but not blocked.
- **Determinism:** analysis and layout must be deterministic (sorted iteration, stable ids from paths)
  so golden-fixture diffs are meaningful. No timestamps/random in the model.
- **Annotations are additive:** missing `@Architecture` comments degrade gracefully; the graph still
  builds from imports + config alone.
- **Drift detection** lives entirely in `reference_resolver`: an edge crossing a macro-group boundary
  into a non-facade module sets `isViolation=true`. Rendering shows it red; no separate subsystem.

---

## 10. Out of scope for MVP (additive later, seams ready)

Narrative diff visualizer (D3 spec §3.4), git time-travel (§3.5), heatmaps (§3.5), LSP/stack-graphs
global resolution (upgrade behind `reference_resolver`), C++ adapter, embedded markdown reader,
PR-comment-on-edge annotations, WebGPU renderer. Each maps to an existing seam — see plan §"Roadmap".
