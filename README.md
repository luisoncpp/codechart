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
