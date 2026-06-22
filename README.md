# CodeChart

CodeChart is a desktop application designed to visualize and analyze the architecture of TypeScript projects. It renders an interactive architectural map based on your codebase's semantic comments, imports, and custom grouping configurations.

## Architecture

CodeChart is built using a modern, performant tech stack:

- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), and [TypeScript](https://www.typescriptlang.org/).
- **Desktop Shell / Backend**: [Tauri](https://tauri.app/) (Rust).
- **Graph Layout & Rendering**: [elkjs](https://github.com/kieler/elkjs) for deterministic graph layout and [React Flow](https://reactflow.dev/) (`xyflow`) for interactive canvas rendering.

### Core Concepts

The architecture is divided into clear subsystems:

- **ProjectGraph Contract**: A pure-data representation of the codebase architecture that crosses the Tauri IPC boundary, ensuring the Rust analysis and React rendering evolve independently.
- **Language Adapter**: Parses TypeScript files and extracts `@Architecture` annotations from semantic comments.
- **Grouping & Analysis**: Analyzes imports to generate edges and diagnostics, resolving nested group trees via `*.group.md` configuration files.
- **Layout & Rendering**: Converts the logical `ProjectGraph` into a deterministic `LayoutedGraph` via ELK, which is then projected onto an interactive canvas supporting multiple levels of "Semantic Zoom" (e.g., L1.5, L2).

## Defining Groups (`*.group.md`)

CodeChart allows you to organize your files into logical groupings without strictly enforcing folder structures. This is configured by creating `*.group.md` files (e.g., `services.group.md`). 

A group configuration file uses YAML frontmatter to declare its rules, alongside a Markdown body for documentation:

```md
---
id: "core-services"
label: "Core Services"
color: "#64748b"
icon: "cube"
match_globs: ["**/*.service.ts"]
exclude: ["**/test/**"]
facades: ["index.ts"]
---

This paragraph acts as the `description_short` for the group.

Further documentation goes here and is parsed as `description_long`.
```

### Group Capabilities & Membership

Groups use a claim resolution system to determine which modules belong to them.

- **Folder Ownership (No Membership Defined)**: If a group omits `match_globs`, `files`, and `groups` altogether, it defaults to **folder ownership**. It claims every source file inside its directory. If multiple nested folders define folder-ownership groups, the **innermost** group wins the module.
- **Overlap (Multiple Memberships Defined)**: Overlap is an error, never silently resolved. If a single module is successfully claimed by two or more groups (for instance, one group matches it with `match_globs` and another names it in `files`), CodeChart will emit a `configError:overlap:<module>` diagnostic and leave the module unassigned. To fix overlaps, the "losing" group must explicitly cede the module using an `exclude` filter.
- **Flexible Rules**:
  - `match_globs: ["**/*.ts"]`: Claims files matching glob patterns relative to the `*.group.md` directory.
  - `files: ["api.ts"]`: Explicitly lists files relative to the group directory.
  - `exclude: ["tests/**"]`: Subtracts matches from the group's claim (e.g. carving out cross-cutting concerns).
- **Nesting**: Groups can reference other groups via `group_refs`, allowing you to build an architectural tree of arbitrary depth (e.g., `app` claiming `core` and `services`).
- **Facades**: Defining `facades` (e.g., `index.ts`) allows a group to specify its public API. Imports hitting the facade are treated as clean, whereas deep imports may trigger architectural drift warnings.

## Annotations (`@Architecture`)

Individual source files can be documented and categorized directly within their own source code using **Annotations**. The language adapter reads these out of standard source comments.

Annotations use the format `@Architecture(key=value)` inside any comment block. For example:

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

### Available Annotation Keys
- `type`: Architectural role (e.g., "model", "controller", "util").
- `group`: An override to explicitly place the module into a specific group ID.
- `descriptionShort`: A brief, one-line summary used in higher zoom levels on the canvas.
- `descriptionLong`: A detailed explanation shown when inspecting the module.
- `icon`: A visual icon identifier for the canvas. 

### Styling Formats

If you define a custom `color` or `icon` in a group or annotation, please follow these formats:

- **Colors**: Must be standard 6-character hex codes starting with `#` (e.g., `#64748b`). The rendering engine relies on this precise format to compute contrasting UI tints.
- **Icons**: Must be one of the registered icon identifiers: `cube`, `wrench`, `gear`, `bolt`, `hook`, `database`, `layers`, `panel`, `dialog`, `sidebar`, `app-window`, `plug`, `share`, `layout`, or `globe`.

For in-depth architectural details, see the [Architecture Docs](docs/architecture/README.md).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Tauri dependencies for your OS (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation

```bash
# Install dependencies
npm install
```

### Development Scripts

- `npm run dev`: Starts the Vite development server and opens the Tauri desktop application.
- `npm run check`: Runs ESLint, typechecking, Vitest suite, and the Rust cargo tests. It also regenerates the `ProjectGraph` TypeScript bindings via `ts-rs`.
- `npm run build`: Compiles TypeScript and builds the Vite production bundle.
- `npm run dist:win`: Builds the Windows `.msi` and `.nsis` installers.
- `npm test`: Runs the Vitest test suite.

## Development Guidelines

When contributing to this codebase, please adhere to our project guidelines:
- **Deep Modules**: Organize code into deep modules (folders with an `index.ts` public interface or `Private` implementation folders).
- **Functions & Parameters**: Limit functions to <30 lines and <3 parameters. Use inline comments to simulate named arguments for booleans or >3 parameters.
- **Inline Logic**: Prefer inline logic over unnecessary custom hooks or abstractions that only serve to group unrelated assignments.
- Read the full [Guidelines](docs/GUIDELINES.md) and [Workflow](docs/WORKFLOW.md) before implementing new features or fixing bugs.
