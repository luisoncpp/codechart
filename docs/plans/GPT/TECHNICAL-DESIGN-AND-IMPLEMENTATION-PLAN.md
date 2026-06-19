# Codechart Technical Design And Implementation Plan

## Purpose

This document turns `docs/specs/DESIGN.md` into a concrete technical plan for the
first implementation of Codechart. It is intentionally explicit: future agents should
be able to implement the project without making new architectural choices unless the
requirements change.

The first buildable goal is a desktop app that:

1. Lets the user select one local TypeScript/TSX project.
2. Analyzes the project in a Rust/Tauri backend.
3. Produces a stable semantic graph of files, groups, imports, and diagnostics.
4. Renders that graph in React using React Flow and ELK.
5. Looks and behaves like an architecture diagram, not a generic node demo.

## Locked Decisions

| Decision | Choice | Consequence |
| --- | --- | --- |
| Desktop shell | Tauri | Rust owns backend analysis and filesystem access. |
| Frontend framework | React | UI modules are TS/TSX. |
| Graph rendering | React Flow | Canvas interaction, nodes, edges, selection, viewport. |
| Layout engine | ELK | Deterministic nested graph layout. |
| Parsing location | Rust backend | Frontend receives graph DTOs, not raw source. |
| First language | TypeScript/TSX | Parser, resolver, fixtures, and UI copy target TS first. |
| First vertical slice | Static graph from one TS project | No Git review, semantic zoom, or time-travel until this works. |

## Visual Target

The attached reference image is a technical architecture map with these qualities:

- Dense, readable diagram-first layout.
- File/component nodes with compact labels.
- Large bounded zones for major responsibilities.
- Smaller bounded zones for catalogs such as hooks, pure logic, dialogs, and renderer effects.
- Solid black or colored arrows for structural ownership/dependencies.
- Dashed colored arrows for softer cross-module relationships.
- Light background, crisp borders, modest radius, and high information density.
- Icons used sparingly to identify categories, not as decoration.
- A visual distinction between public/facade modules and private/supporting modules.

The MVP should not attempt to recreate every detail, but every visual decision should
move toward this diagram language.

## Product Model

Codechart models a repository as a hierarchical attributed graph.

| Entity | Definition |
| --- | --- |
| Project | One analyzed repository root. |
| SourceModule | One source file, initially `.ts` or `.tsx`. |
| Group | Nested, non-overlapping container for modules or subgroups. |
| Facade | A module designated as the public entry point for a group. |
| Edge | A relationship between modules, groups, symbols, or facades. |
| Annotation | Extracted or configured metadata attached to graph entities. |
| Diagnostic | Non-fatal analysis issue, unresolved import, invalid config, or architecture violation. |
| Violation | A diagnostic caused by a broken architecture rule. |

### Initial Edge Types

| Kind | Render | Meaning | MVP? |
| --- | --- | --- | --- |
| `import` | Solid edge | Source file imports another resolved source file. | Yes |
| `unresolvedImport` | Diagnostic, optional warning edge | Import could not be resolved to a known file. | Yes |
| `soft` | Dashed edge | Runtime/event/context relationship. | Reserved |
| `facadeReroute` | Solid or grouped facade edge | Collapsed group routes private edges through facade. | Later |
| `violation` | Red diagnostic edge | Rule breach such as importing private module directly. | Phase 4 |

## Non-Goals For MVP Milestone 1

- No pull request review workflow.
- No Git timeline or time travel.
- No semantic zoom with inline source code.
- No live incremental analysis.
- No multi-language parser.
- No LSP/stack-graph global symbol resolution.
- No AI summarization layer.

These are part of the broader vision, but they must not block the first static graph.

## Repository Shape

Recommended initial project shape:

```text
src/
  app/
    App.tsx
  domain/
    graph/
      index.ts
      Private/
    layout/
      index.ts
      Private/
  features/
    project_loader/
      index.ts
      Private/
    graph_canvas/
      index.ts
      Private/
    inspection_panel/
      index.ts
      Private/
  shared/
    ui/
    testing/
src-tauri/
  src/
    main.rs
    tauri_api/
      mod.rs
      Private/
    project_graph/
      mod.rs
      Private/
    project_config/
      mod.rs
      Private/
tests/
  fixtures/
    ts-basic-project/
```

Deep module rule:

- External code imports only `index.ts`, `mod.rs`, or another explicit public facade.
- `Private` folders are implementation details.
- A deep module may contain smaller deep modules, but callers still use the nearest public interface.

## Backend Architecture

The backend owns source discovery, parsing, resolving, grouping, diagnostics, and
serialization. It does not own visual layout coordinates.

### `src-tauri/src/project_graph`

Public interface:

```rust
pub fn analyze_project(request: AnalyzeProjectRequest) -> Result<ProjectGraph, AnalyzeError>
```

Responsibilities:

- Coordinate all analysis steps.
- Keep all module IDs stable and repository-relative.
- Produce a graph DTO that can be serialized over Tauri.
- Keep partial results useful even when some files fail.
- Report diagnostics instead of failing the whole graph for normal source issues.

Private modules:

| Module | Responsibility |
| --- | --- |
| `scanner` | Walk project root and discover source files. |
| `parser_ts` | Parse TypeScript/TSX imports, exports, and metadata comments. |
| `import_resolver` | Resolve module specifiers to discovered source files. |
| `grouping` | Assign files to configured or inferred groups. |
| `graph_builder` | Convert parsed modules and resolved imports into graph DTOs. |
| `diagnostics` | Normalize analysis warnings and errors. |
| `dto` | Own serializable request/response types. |

Core structs:

| Struct | Responsibility |
| --- | --- |
| `ProjectAnalyzer` | Orchestrates scanning, parsing, resolving, grouping, and graph building. |
| `SourceScanner` | Discovers `.ts` and `.tsx` files while applying ignore rules. |
| `TsModuleParser` | Extracts imports, exports, and architecture comments from one file. |
| `ImportResolver` | Maps relative import specifiers to canonical module IDs. |
| `GroupClassifier` | Applies config rules or folder inference to each module. |
| `GraphBuilder` | Creates graph nodes, groups, edges, and diagnostics. |

`ProjectAnalyzer` flow:

1. Load project config using `project_config`.
2. Scan files under the project root.
3. Parse each file independently.
4. Resolve import specifiers against the discovered file index.
5. Classify modules into groups.
6. Build graph DTO.
7. Return graph plus diagnostics.

### `src-tauri/src/project_config`

Public interface:

```rust
pub fn load_config(root: ProjectRoot) -> Result<ProjectConfig, ConfigLoadError>
```

Responsibilities:

- Find optional config file in the analyzed project.
- Provide defaults when no config exists.
- Validate group IDs, glob rules, facade rules, and ignored paths.
- Return diagnostics that can be shown to the user.

Initial config file name:

```text
codechart.config.json
```

Initial config shape:

```json
{
  "groups": [
    {
      "id": "frontend",
      "label": "Frontend",
      "color": "blue",
      "match": ["src/**"],
      "facades": ["src/index.ts"]
    }
  ],
  "ignore": ["node_modules/**", "dist/**", "build/**"]
}
```

Private modules:

| Module | Responsibility |
| --- | --- |
| `schema` | Typed config structs and defaults. |
| `loader` | Locate and parse config file. |
| `matcher` | Glob/path matching against repo-relative paths. |
| `validation` | Config errors and warnings. |

### `src-tauri/src/tauri_api`

Public surface: Tauri commands only.

Responsibilities:

- Keep command signatures narrow.
- Convert UI requests to backend request structs.
- Convert backend errors into serializable user-facing errors.
- Avoid leaking backend private types to frontend.

Initial command:

```rust
#[tauri::command]
pub async fn analyze_project(request: AnalyzeProjectRequest) -> Result<ProjectGraph, ApiError>
```

Later commands:

- `read_source_file`: fetch selected module source text.
- `load_project_config`: preview config and validation diagnostics.
- `export_graph_json`: write or return current graph JSON.

## Frontend Architecture

The frontend owns project session state, graph projection, ELK layout, rendering,
selection, and inspection. It should not parse source code or infer dependencies.

### `src/domain/graph`

Public interface:

```ts
export type { ProjectGraph, GraphNode, GraphEdge, GraphGroup, GraphDiagnostic };
export class GraphProjector { ... }
export class GraphSelection { ... }
```

Responsibilities:

- Mirror backend DTOs as TypeScript types.
- Convert backend graph data into render-neutral intermediate structures.
- Convert render-neutral structures into React Flow nodes and edges.
- Provide selectors for selected module, group, edge, and diagnostics.

Private modules:

| Module | Responsibility |
| --- | --- |
| `types` | DTO mirrors and frontend-only graph types. |
| `react-flow-adapter` | Map graph entities to React Flow models. |
| `selectors` | Read-only graph projections. |
| `validation` | Frontend contract assertions for impossible DTO states. |

Core classes:

| Class | Responsibility |
| --- | --- |
| `GraphProjector` | Converts `ProjectGraph` into React Flow-compatible nodes and edges. |
| `GraphSelection` | Owns selected entity ID and resolves selected details from the graph. |

### `src/domain/layout`

Public interface:

```ts
export function layoutGraph(request: LayoutRequest): Promise<LayoutedGraph>;
```

Responsibilities:

- Convert Codechart graph shape to ELK input.
- Run ELK with deterministic presets.
- Map coordinates back to graph nodes and groups.
- Keep ELK details away from React components.

Private modules:

| Module | Responsibility |
| --- | --- |
| `elk-model` | Build ELK graph model. |
| `elk-runner` | Execute ELK and handle errors. |
| `layout-presets` | Own spacing, direction, nesting, and edge routing settings. |
| `layout-cache` | Later cache layouts by graph hash and view mode. |

Core classes:

| Class | Responsibility |
| --- | --- |
| `ElkLayoutEngine` | Owns conversion, ELK config, execution, and result mapping. |
| `LayoutCache` | Later avoids recomputing unchanged graphs. |

Initial layout preset:

- Direction: top-to-bottom for module ownership flows.
- Secondary catalogs may lay out vertically.
- Groups use padding large enough to read zone labels.
- Edge routing should prefer orthogonal or layered routing when practical.

### `src/features/project_loader`

Public interface:

```ts
export function ProjectLoaderPanel(): JSX.Element;
export class ProjectSession { ... }
```

Responsibilities:

- Let user select a local folder.
- Call `analyze_project`.
- Represent session states: idle, loading, ready, failed.
- Expose diagnostics and graph data to the rest of the app.

Core classes:

| Class | Responsibility |
| --- | --- |
| `ProjectSession` | Class-backed state machine for current project analysis. |
| `ProjectAnalysisClient` | Typed wrapper around Tauri command invocation. |

UI states:

- Idle: project selection control.
- Loading: selected path and progress wording.
- Ready: graph canvas plus diagnostics count.
- Failed: recoverable error with retry.
- Empty: no TS/TSX files found.

### `src/features/graph_canvas`

Public interface:

```ts
export function GraphCanvas(props: GraphCanvasProps): JSX.Element;
```

Responsibilities:

- Render React Flow canvas.
- Render custom module, facade, group, and diagnostic nodes.
- Render solid and dashed custom edges.
- Own viewport controls and layer toggles.
- Dispatch selection changes to inspection.

Private modules:

| Module | Responsibility |
| --- | --- |
| `nodes` | Custom node components. |
| `edges` | Custom edge components and styles. |
| `controls` | Fit view, zoom, layout, and layer toggles. |
| `state` | Controller and hook adapter. |

Core classes:

| Class | Responsibility |
| --- | --- |
| `GraphCanvasController` | Selection, focus, layer visibility, and layout requests. |
| `GraphViewportState` | Serializable pan, zoom, and focused entity. |

Hook rule:

- Complex behavior belongs in classes.
- Hooks adapt class state to React lifecycle.
- Do not build large behavior-only hooks when a class controller is clearer.

### `src/features/inspection_panel`

Public interface:

```ts
export function InspectionPanel(props: InspectionPanelProps): JSX.Element;
```

Responsibilities:

- Show details for selected module, group, edge, or diagnostic.
- Show module path, imports, imported-by list, group, facade status, and metadata.
- Show diagnostic explanation and suggested next inspection target.

Initial panel sections:

- Overview.
- Imports.
- Imported by.
- Diagnostics.
- Metadata.

## Data Contracts

Backend returns frontend-ready data without coordinates.

```ts
type ProjectGraph = {
  projectRoot: string;
  generatedAt: string;
  nodes: GraphNode[];
  groups: GraphGroup[];
  edges: GraphEdge[];
  diagnostics: GraphDiagnostic[];
};

type GraphNode = {
  id: string;
  kind: "sourceModule";
  path: string;
  label: string;
  language: "typescript" | "tsx";
  groupId?: string;
  isFacade: boolean;
  metadata?: GraphMetadata;
};

type GraphGroup = {
  id: string;
  label: string;
  parentId?: string;
  color?: GraphColorName;
  facadeNodeIds: string[];
};

type GraphEdge = {
  id: string;
  kind: "import" | "unresolvedImport" | "soft" | "violation";
  sourceId: string;
  targetId?: string;
  unresolvedTarget?: string;
  metadata?: GraphMetadata;
};

type GraphDiagnostic = {
  id: string;
  severity: "info" | "warning" | "error";
  kind: "parseError" | "unresolvedImport" | "configError" | "architectureViolation";
  message: string;
  nodeId?: string;
  edgeId?: string;
};
```

Stable ID rules:

- Module ID: normalized repository-relative path with `/` separators.
- Group ID: configured group ID, otherwise normalized folder path prefixed with `folder:`.
- Edge ID: `${sourceId}->${targetId}:${kind}:${ordinal}`.
- Diagnostic ID: deterministic when tied to a module/import; generated only for global failures.

## Key Seams

| Seam | Boundary | Rule |
| --- | --- | --- |
| Frontend/backend | Tauri DTOs | Backend owns analysis truth; frontend never parses source. |
| Analysis/layout | `ProjectGraph` to `LayoutedGraph` | Backend emits semantic graph; frontend ELK emits coordinates. |
| Domain/UI | Projectors and selectors | Components render projected data and dispatch user actions. |
| Config/defaults | `ProjectConfig` | Analyzer must work with no config and improve with config. |
| Static/dynamic edges | Edge `kind` | Import edges ship first; soft edges are reserved for later analyzers. |
| Diagnostics/violations | `GraphDiagnostic` | Normal source issues are visible diagnostics, not app crashes. |
| Fixture/user validation | Debug JSON and screenshot | Every phase must be inspectable by a human before the next phase. |

## Parser And Resolver Rules

Phase 1 parser must handle:

- `import React from "react"`.
- `import { useMemo } from "react"`.
- `import * as fs from "fs"`.
- `import type { Foo } from "./foo"`.
- `import "./setup"`.
- Re-export imports can be added in phase 1 if cheap, otherwise phase 2.

Resolver must handle:

- Relative imports only for MVP graph edges.
- Extensionless `.ts`, `.tsx`.
- Explicit `.ts`, `.tsx`.
- `index.ts`, `index.tsx`.
- Non-relative package imports as external/unresolved metadata, not graph nodes.

Ignore defaults:

- `.git/**`
- `node_modules/**`
- `dist/**`
- `build/**`
- `.next/**`
- `coverage/**`

## Fixture Requirements

Create `tests/fixtures/ts-basic-project` early and grow it phase by phase. The
fixture is the user's shared reference point for proving that implementation is not
drifting away from the design.

Initial fixture files:

```text
src/
  app.tsx
  project-editor-view.tsx
  sidebar/
    sidebar-panel.tsx
    sidebar-tree.tsx
    sidebar-tree-row-button.tsx
  workspace/
    workspace-editor-panels.tsx
    editor-panel.tsx
    rich-markdown-editor.tsx
  logic/
    sidebar-tree-logic.ts
    project-editor-folder-logic.ts
```

The fixture should intentionally include:

- One top-level app file.
- Two or three visible responsibility groups.
- At least one facade-like module per major group.
- A small chain of imports to prove direction and layout.
- One unresolved import for diagnostics.
- One later private import violation for phase 4.
- One metadata comment block for phase 5.

Expected fixture artifacts:

- A checked-in expected graph count file or snapshot.
- A debug JSON export generated by the app or test helper.
- A screenshot captured after the canvas exists.

## Phase Gate Rules

Every phase must leave behind evidence that can be inspected without reading the
whole codebase.

| Evidence | Purpose |
| --- | --- |
| Fixture test | Proves the analyzer behavior with real files. |
| Unit tests | Prove narrow parser, resolver, projector, or controller rules. |
| Debug JSON | Lets the user confirm graph truth before visual decisions. |
| Screenshot | Lets the user detect visual drift from the target aesthetic. |
| Current status update | Tells future agents what is done and what is next. |

Do not advance to the next phase when:

- The fixture graph count is surprising.
- The UI hides a backend diagnostic.
- Layout changes unpredictably on refresh.
- A visual change makes dense graphs harder to read.
- A rule produces a false positive that the user cannot explain from the UI.

## Implementation Plan

### Phase 0: Scaffold

Goal: create the runnable app and test surface.

Tasks:

- Create Tauri + React + TypeScript project structure.
- Add Rust modules for `tauri_api`, `project_graph`, and `project_config`.
- Add frontend deep modules for `domain` and `features`.
- Add a fixture TS project under `tests/fixtures/ts-basic-project`.
- Add commands for Rust tests, frontend unit tests, typecheck, lint, and dev server.

Tests/checks:

- `cargo test`
- frontend unit test command
- frontend typecheck command
- lint command

User checkpoint:

- App opens to a useful project loader screen.
- No marketing/landing page as the primary screen.
- Fixture project exists and can be used by later phases.

### Phase 1: Backend Static Graph

Goal: `analyze_project` returns modules, import edges, and diagnostics.

Tasks:

- Implement config defaults.
- Implement source scanning with ignore rules.
- Build discovered-file index.
- Parse TS/TSX imports per file.
- Resolve relative imports against the file index.
- Emit `ProjectGraph`.
- Emit diagnostics for parse failures and unresolved relative imports.

Tests:

- Scanner includes `.ts` and `.tsx`.
- Scanner ignores default ignored folders.
- Parser covers default, named, namespace, type-only, and side-effect imports.
- Resolver covers extensionless files and index files.
- Integration test analyzes fixture and snapshots graph counts.

User checkpoint:

- Export or log fixture graph JSON.
- User confirms module count, import edge count, and unresolved-import count.
- Do not start UI polish until the data is trusted.

### Phase 2: Frontend Projection And Canvas

Goal: render the backend graph with deterministic layout.

Tasks:

- Add typed Tauri client for `analyze_project`.
- Implement `ProjectSession`.
- Implement `GraphProjector`.
- Implement `ElkLayoutEngine`.
- Render React Flow custom module nodes.
- Render solid import edges.
- Add loading, ready, failed, and empty states.
- Add selected node inspection with path and imports.

Tests:

- DTO adapter test with fixture JSON.
- Projection test from graph DTO to React Flow models.
- ELK smoke test verifies every node gets finite coordinates.
- Component tests for loader states.
- Component test for selecting a node and showing details.

User checkpoint:

- User opens fixture through UI.
- Graph visually matches fixture JSON.
- Layout remains stable after refresh.
- Screenshot is saved or compared manually against previous run.

### Phase 3: Groups, Facades, And Diagram Aesthetic

Goal: render architecture zones and facade semantics.

Tasks:

- Add `codechart.config.json` support for groups and facades.
- Infer folder-based groups when config is absent.
- Render group boundaries as colored zones.
- Render facade nodes with distinct styling.
- Add compact labels and category colors.
- Add edge styles for solid imports and reserved dashed soft edges.
- Add visual tokens inspired by the reference image.

Tests:

- Config loader tests valid config, missing config, invalid config.
- Matcher tests path glob precedence.
- Group projection tests nested groups.
- Facade projection tests.
- Screenshot smoke review for fixture graph.

User checkpoint:

- User confirms the graph reads like the target architecture-map aesthetic.
- User checks density, color grouping, labels, and edge routing.
- If readability fails, fix style before adding diagnostics.

### Phase 4: Architecture Diagnostics

Goal: flag simple architectural drift.

Tasks:

- Extend config with private group and allowed facade rules.
- Detect imports from outside a group into private modules.
- Mark violating edges and diagnostics.
- Show diagnostic details in inspection panel.
- Suggest facade target when known.

Tests:

- Rule test for allowed facade import.
- Rule test for forbidden private import.
- Fixture with one intentional violation.
- UI test for diagnostic list.
- UI test for selecting violation edge.

User checkpoint:

- User sees one known fixture violation.
- User can explain why it is flagged from the UI alone.
- User confirms false positives are not acceptable before rule expansion.

### Phase 5: Metadata And Explanation

Goal: make graph nodes explain intent.

Tasks:

- Parse architecture comment blocks from TS/TSX files.
- Attach short descriptions, long descriptions, icons, and group/facade hints.
- Render metadata in inspection panel.
- Add graph JSON export for future review flows.

Example metadata:

```ts
// @Architecture(Type="Facade", Group="Workspace")
// @DescriptionShort="Coordinates layout canvas metadata and split panels."
// @Icon="layout-split"
```

Tests:

- Metadata parser tests.
- DTO serialization tests.
- Metadata rendering tests.
- Missing metadata fallback tests.

User checkpoint:

- User compares before/after fixture graph and inspection panel.
- User confirms metadata improves comprehension without making the graph noisy.

## Guardrails Against Derailment

- Keep every phase end-to-end: fixture, backend data, UI surface, tests, and user checkpoint.
- Do not implement Git review, semantic zoom, or time-travel before grouped static graph works.
- Trust graph JSON before visual polish.
- Add one fixture expectation for every analyzer capability.
- Prefer class-backed controllers with hook adapters for complex state.
- Keep deep module internals private.
- Split source files by responsibility early.
- Use screenshots to catch visual drift.
- Treat diagnostics as user-visible product behavior, not just logs.
- When a phase fails a user checkpoint, fix that phase before moving forward.

## MVP Milestone 1 Definition Of Done

MVP milestone 1 is complete when:

- User can choose one local TS/TSX project.
- Backend returns source modules, resolved import edges, and unresolved-import diagnostics.
- Frontend renders the graph with React Flow and ELK.
- Layout is stable across refresh for the same fixture.
- Selected nodes show path, group, facade status, imports, and imported-by list.
- Empty, loading, error, and ready states exist.
- Tests cover scanner, parser, resolver, DTO projection, layout smoke, and basic UI states.
- A fixture project can be analyzed repeatedly with stable IDs.

## Later Roadmap

After MVP milestone 1:

1. Add stronger TypeScript semantics with LSP or stack-graphs.
2. Detect soft edges: event emitters, context providers, hooks, pub/sub tokens.
3. Add semantic zoom levels.
4. Add markdown/source split inspection.
5. Add Git diff path visualization.
6. Add guided review order.
7. Add timeline and heatmap layers.

These later items should reuse the same graph contract instead of creating a parallel
model.
