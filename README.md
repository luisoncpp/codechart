# CodeChart

CodeChart is a desktop application for visualizing and analyzing software architecture. It renders an interactive map of your codebase from imports, semantic annotations, and optional `*.group.md` configuration — across TypeScript, Rust, C#, and Unity projects.

## Supported Languages

CodeChart uses pluggable **language adapters** (tree-sitter parsers behind a common trait). Each adapter extracts imports, exports, comments, and language-specific relationship signals from a single source file.

| Language | Extensions | What is extracted |
|----------|------------|-------------------|
| **TypeScript / JavaScript** | `.ts`, `.tsx`, `.mts`, `.cts` | ES imports & re-exports, exported symbols, `@Architecture` annotations, event emit/listen signals, `implements` clauses, Tauri `invoke("…")` calls |
| **Rust** | `.rs` | `mod` / `use` / `pub use`, exported items, `impl Trait for Type`, `#[tauri::command]` handlers |
| **C#** | `.cs` | `using` / `global using`, namespaces, exported types, type references in the file body, `: IFoo` implementations |
| **Unity prefabs** | `.prefab` | YAML-serialized assets: `m_Script` GUIDs → `.cs` modules, nested prefab refs, custom `MonoBehaviour` fields as exported symbols (requires a Unity project with `.meta` files) |
| **CSS** | `.css` | Relative `@import` rules (side-effect dependency edges) |

Annotations (`@Architecture(…)`) are parsed from comment text in **any** supported language — they are not TypeScript-specific.

Unsupported extensions are skipped during analysis. Package / external imports (e.g. `react`, `std`, `System`) are recorded as metadata but do not produce graph edges.

## Features

### Interactive architecture map

- **Open any folder** via the native directory picker; the Rust backend analyzes it and streams a `ProjectGraph` over Tauri IPC.
- **ELK layout** + **React Flow** canvas: nested colored group containers, module cards, floating import arrows, deterministic positioning.
- **Inspection panel** for the selected module or group: path, group, facade status, language, LOC, imports, imported-by, diagnostics, and annotation metadata. Drag the left edge to resize (200–720px); hide/show preserves width for the session.
- **Reveal in file explorer** from the module/symbol context menu.

### Groups & configuration

- Declare logical groups with co-located **`*.group.md`** files (YAML frontmatter + Markdown body) — no need to mirror folder structure strictly.
- Membership via folder ownership, `match_globs`, explicit `files`, and nested `group_refs`; overlap between groups is a **config error**, never silently resolved.
- **Facades** (`index.ts`, etc.) mark a group's public API; deep imports into private groups can trigger drift warnings.
- **Disconnect defaults** per group or module (`disconnected`, `disconnectedModules`) to hide noisy edges on load.
- **Folder inference** when no group files exist: one group per directory with source files.

### Dependency & relationship edges

| Edge kind | Appearance | Meaning |
|-----------|------------|---------|
| **Import** | Solid grey arrow | Resolved relative import / re-export between modules |
| **Violation** | Red, thicker | Facade bypass — importing a private module inside a facaded group from outside |
| **Soft** | Dashed, bowed arc | Runtime or cross-boundary relationships imports cannot see |

Soft edges are detected for:

- **Events** — `emit`/`on`/`subscribe`-style calls with a string-literal token, paired across modules (TypeScript).
- **Interface seams** — a module imports an interface name implemented by a module in a different group, with no direct import edge (TypeScript `implements`, Rust `impl Trait for`).
- **Tauri IPC** — TypeScript `invoke("cmd")` paired with a Rust `#[tauri::command]` handler.
- **Unity assets** — prefab → script (`.cs`) and prefab → nested prefab GUID resolution.

### Semantic zoom (L0 → L2)

Scroll zoom drives four detail levels over the same immutable graph:

- **L0 — Bird's eye:** every group collapses to a labeled card; edges re-route to group boxes.
- **L1 — Architectural:** full module boxes with fit-to-box filenames; group short descriptions inline.
- **L1.5 — Symbols:** exported symbols rendered inside each module; click a symbol to open a **source preview widget** scrolled to its definition.
- **L2 — Implementation:** full syntax-highlighted source inside each module box (lazy-loaded, not stored in the graph contract).

Double-click or use the chevron to collapse/expand individual groups. A level badge shows the active zoom tier.

### Diagnostics

- `unresolvedImport` — relative import could not be resolved to a known module.
- `configError:*` — bad group YAML, membership overlap, unknown facade, etc.
- `architectureViolation:*` — facade bypass (matches red edges on the canvas).
- `unresolvedIpc` — Tauri invoke with no matching Rust command.
- `unresolvedUnityAsset` — prefab GUID with no indexed `.meta` target.
- `parseError` — file read or parse failure (partial results: the rest of the project still builds).

### Narrative diff visualizer

Overlay a change set on the live map:

- **Paste mode** — unified diff text → green/red module borders.
- **Git commits mode** — pick base + head refs → module highlights from git paths, added/removed edges from graph comparison, ghost positions for deleted modules.

Unchanged modules dim to ~40% opacity; added edges render green, removed edges red with an **×** head. L2 panels and the symbol preview show `+`/`-` diff rows when line data is available.

### Canvas controls

- **Hide tests** — filter `*.test.*`, `*.spec.*`, and files under `test`/`tests`/`__tests__` directories.
- **Connection toggles** (🔌) on groups and modules — temporarily hide edges touching disconnected nodes (session-only; inspection still shows the raw graph).
- **Selection-aware edges** — imports from the selected module turn orange, imported-by turn blue.

## Architecture

CodeChart is built using a modern, performant tech stack:

- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), and [TypeScript](https://www.typescriptlang.org/).
- **Desktop shell / backend**: [Tauri](https://tauri.app/) (Rust).
- **Parsing**: [tree-sitter](https://tree-sitter.github.io/) (per-language adapters).
- **Graph layout & rendering**: [elkjs](https://github.com/kieler/elkjs) for deterministic layout and [React Flow](https://reactflow.dev/) (`@xyflow/react`) for the interactive canvas.

### Core concepts

- **ProjectGraph contract**: a pure-data representation of the codebase architecture that crosses the Tauri IPC boundary, keeping Rust analysis and React rendering independent.
- **Language adapters**: one adapter per language; each file → local facts (`ParsedModule`). Cross-file resolution happens in a separate references pass.
- **Grouping & analysis**: imports → solid edges; post-passes classify drift, soft edges, IPC, Unity assets, and interface seams; diagnostics merged deterministically.
- **Layout & rendering**: `ProjectGraph` → `LayoutedGraph` (ELK) → React Flow projection, with zoom projection (`projectForZoom`) applied before layout at collapsed levels.

For subsystem-level design, see the [Architecture Docs](docs/architecture/README.md). For end-to-end user flows, see [Flow Docs](docs/flows/README.md).

## Defining Groups (`*.group.md`)

CodeChart organizes files into logical groupings without strictly enforcing folder structures. Create `*.group.md` files (e.g. `services.group.md`) with YAML frontmatter and a Markdown body:

```md
---
id: "core-services"
label: "Core Services"
color: "#64748b"
icon: "cube"
match_globs: ["**/*.service.ts"]
exclude: ["**/test/**"]
facades: ["index.ts"]
disconnected: false
disconnectedModules: ["legacy.ts"]
---

This paragraph acts as the `description_short` for the group.

Further documentation goes here and is parsed as `description_long`.
```

### Group capabilities & membership

Groups use a claim resolution system to determine which modules belong to them.

- **Folder ownership (no membership defined)**: if a group omits `match_globs`, `files`, and `groups`, it defaults to **folder ownership** — every source file in its directory. Nested folder-ownership groups: the **innermost** group wins the module.
- **Overlap (multiple memberships)**: overlap is an error, never silently resolved. Two groups claiming the same module → `configError:overlap:<module>` and the module is left unassigned. Fix by adding `exclude` on the losing group.
- **Flexible rules**:
  - `match_globs: ["**/*.ts"]` — claims files matching globs relative to the `*.group.md` directory.
  - `files: ["api.ts"]` — explicit paths relative to the group directory.
  - `exclude: ["tests/**"]` — subtracts matches from the group's claim.
- **Nesting**: reference other groups via `group_refs` to build a tree of arbitrary depth.
- **Facades**: `facades` (e.g. `index.ts`) specify the public API; imports hitting the facade are clean, deep imports may trigger drift warnings.

## Annotations (`@Architecture`)

Document and categorize modules directly in source comments. The parser is language-agnostic — use any comment style your language supports.

```ts
/**
 * @Architecture(
 *   type="controller",
 *   icon="cube",
 *   descriptionShort="Handles incoming HTTP requests"
 * )
 */
export class UserController { ... }
```

### Available annotation keys

- `type` — architectural role (e.g. `"model"`, `"controller"`, `"util"`).
- `group` — override to place the module into a specific group ID.
- `descriptionShort` — one-line summary for higher zoom levels and the inspection panel.
- `descriptionLong` — detailed explanation; also used in collapsed group cards when it fits.
- `icon` — visual icon identifier for the canvas.

### Styling formats

- **Colors**: 6-character hex codes starting with `#` (e.g. `#64748b`).
- **Icons**: one of `cube`, `wrench`, `gear`, `bolt`, `hook`, `database`, `layers`, `panel`, `dialog`, `sidebar`, `app-window`, `plug`, `share`, `layout`, or `globe`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Tauri dependencies for your OS (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation

```bash
npm install
```

### Development scripts

- `npm run dev` — starts the Vite dev server (use `npm run tauri dev` for the full desktop app).
- `npm run check` — ESLint, typecheck, Vitest, and Rust `cargo test` (regenerates `ProjectGraph` TypeScript bindings via `ts-rs`).
- `npm run build` — compiles TypeScript and builds the Vite production bundle.
- `npm run dist:win` — builds Windows `.msi` and `.nsis` installers.
- `npm test` — runs the Vitest suite.

### CLI (Rust)

From the repo root:

```bash
# Analyze a project folder → ProjectGraph JSON
cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- analyze <path>

# Print the resolved group tree
cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- groups <path>

# Parse a single source file
cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- parse <file.ts|tsx|rs|cs>
```

## Development guidelines

When contributing, please follow the project conventions:

- **Deep modules**: folders with an `index.ts` public interface or `Private` implementation folders.
- **Functions & parameters**: limit functions to <30 lines and <3 parameters; use inline comments for named boolean arguments.
- **Inline logic**: prefer inline derivations over custom hooks that only group unrelated assignments.

Read the full [Guidelines](docs/GUIDELINES.md) and [Workflow](docs/WORKFLOW.md) before implementing features or fixing bugs.
