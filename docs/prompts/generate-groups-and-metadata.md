# Prompt — Generate group files and module metadata

Copy everything inside the **Agent prompt** block below into a new agent chat. Replace the placeholders in `{ALL_CAPS}` before sending.

Use this when onboarding a project into CodeChart, or when a codebase has no (or incomplete) `*.group.md` files and `@Architecture` annotations.

The prompt is **self-contained**. The agent must not open, clone, or modify any repository other than `{PROJECT_ROOT}`.

---

## Agent prompt

```
You are generating CodeChart architecture metadata for a single project.

CodeChart is a code-architecture visualization tool. It reads two kinds of metadata from the project you are working on:

1. **`*.group.md` files** — co-located YAML frontmatter + markdown body that define nested architectural groups, membership rules, facades, and group documentation.
2. **`@Architecture(...)` comment blocks** — one block at the top of each parsed source module with a short description and optional role hints.

Your job: analyze `{PROJECT_ROOT}`, propose a sensible group tree aligned with how the code is actually organized, write the group files, and add `@Architecture` metadata to every parsed source module that lacks it.

---

## Scope (mandatory)

- Work **only** inside `{PROJECT_ROOT}`. Read and write files there and nowhere else.
- **Do not** open, search, clone, or modify the CodeChart repository or any other external repo. Everything you need is in this prompt.
- **Do not** run commands that leave the target project (no `cargo run` from another checkout, no installing CodeChart).
- **Do not** refactor unrelated code. Touch only new/updated `*.group.md` files and `@Architecture` comment lines in source files.
- Do not commit unless the user asks.

---

## Project context

- **Project root:** `{PROJECT_ROOT}`
- **Primary languages:** `{LANGUAGES}` (e.g. TypeScript, Rust)
- **Architectural intent (optional):** `{ARCHITECTURAL_NOTES}`
- **Constraints (optional):** `{CONSTRAINTS}` (e.g. "keep folder ownership where folders already match domains", "do not annotate tests/", "match existing deep-module boundaries")

---

## What CodeChart parses

**Source modules** (get `@Architecture` metadata):
- Extensions: `.ts`, `.tsx`, `.mts`, `.cts`, `.rs` (case-sensitive).
- Everything else is ignored unless it is a group config file.

**Group config files** (never get `@Architecture`):
- Any path ending in `.group.md`.

**Built-in ignores** (never need a group entry; root `ignore:` adds more):
- `.git/**`, `node_modules/**`, `dist/**`, `build/**`, `.next/**`, `coverage/**`

**Deep-module convention** (common in TypeScript/Rust codebases):
- A folder with `index.ts`, `index.tsx`, or `mod.rs` at its public boundary is usually a **deep module**: one architectural unit.
- The facade file is the **only public entry**; every other file in that unit (including everything under `Private/`) is **implicitly private**.
- **One deep module = one group.** Never split a deep module into a "public" group and a "private" group.

---

## Deep modules and `Private/` folders (critical)

### The rule

**Facade and private files always belong to the same group.**

The `facades` field marks which module(s) are public. All other modules in the group are private by definition. You do **not** need — and must **not** create — a separate group to label implementation files as private.

### Never do this

**Wrong** — two groups for one deep module (parent holds facade, child holds `Private/`):

```
sidebar-drop-logic/
  sidebar-drop-logic.group.md   ← facade: index.ts
  index.ts                      ← in parent group
  Private/
    private.group.md              ← WRONG: separate "private" group
    container-handlers.ts
    drop-execution.ts
    ...
```

This produces a split box on the canvas: a tiny facade-only group next to a "PRIVATE" sub-group. That is incorrect.

**Right** — one group for the whole deep module:

```
sidebar-drop-logic/
  sidebar-drop-logic.group.md   ← facades: [index.ts]; folder ownership
  index.ts                      ← facade (public)
  Private/
    container-handlers.ts       ← same group (private by default)
    drop-execution.ts
    ...
```

No `*.group.md` inside `Private/`. The group body mentions that implementation lives under `Private/`; the graph does not need a nested group for it.

### Hard prohibitions

- **Never** place a `*.group.md` inside `Private/`, `private/`, or similar implementation-only folders.
- **Never** create a group whose label/id/name contains "Private" (or "Internal") just to hold non-facade files.
- **Never** use `groups:` to nest a "private implementation" child under the same deep module — use a single flat group instead.

### Multiple deep modules in one folder

When one directory contains **several** independent deep modules (each with its own facade and its own `privateX/` subtree), create **one group per deep module** — not one group per subfolder blindly, and not one group for the whole directory.

Example layout:

```
widgets/
  privateA/foo.ts
  privateA/bar.ts
  A.ts              ← facade for module A
  privateB/foo.ts
  privateB/bar.ts
  B.ts              ← facade for module B
```

Use **two** group files in `widgets/`, both with explicit membership (no folder ownership — that would merge everything):

`widgets/module-a.group.md`:

```md
---
id: module-a
label: Module A
facades:
  - A.ts
match:
  - A.ts
  - privateA/**
descriptionShort: ...
---
```

`widgets/module-b.group.md`:

```md
---
id: module-b
label: Module B
facades:
  - B.ts
match:
  - B.ts
  - privateB/**
descriptionShort: ...
---
```

`A.ts` and `B.ts` land in **different groups** even though they share a folder — that is correct. Each group still owns its facade **and** its private subtree together.

When multiple group files share a folder, name each file after its module (e.g. `module-a.group.md`), not only `{folder}.group.md`.

---

## Format reference — `*.group.md`

### Placement and naming

- One `*.group.md` per group, **in the folder it describes**.
- Name after the folder: `src/features/billing/billing.group.md`.
- Optional root config: `{project-name}.group.md` at the repo root (for project-wide `ignore` only).

### Structure (required)

Every file **must** start with YAML frontmatter fenced by `---`, then a markdown body:

```md
---
id: billing
label: Billing
color: "#64748b"
icon: plug
facades:
  - index.ts
descriptionShort: Payment and subscription IO
---

Data access for Stripe and internal billing tables. Callers import through index.ts; provider adapters and mappers stay private.
```

**Parsing rules:**
- Invalid or missing frontmatter → config error; the file is skipped.
- All frontmatter fields are optional; unknown keys are ignored.
- `descriptionLong` = markdown body (trimmed), stored **verbatim** (preserve punctuation exactly).
- `descriptionShort` = frontmatter `descriptionShort`, or else the **first non-empty body paragraph** (not a heading), flattened to one line.
- Default `id` = last folder segment (`root` for a file at repo root). Default `label` = humanized id (`data-access` → `Data Access`).

### Frontmatter fields

| Field | Notes |
|-------|-------|
| `id` | Stable snake_case or kebab-case identifier. Referenced by `groups:` in parent files. |
| `label` | Short human title for the canvas. |
| `color` | Exactly `#` + 6 hex digits (e.g. `#64748b`). Used for group tinting. |
| `icon` | One of: `cube`, `wrench`, `gear`, `bolt`, `hook`, `database`, `layers`, `panel`, `dialog`, `sidebar`, `app-window`, `plug`, `share`, `layout`, `globe`. |
| `facades` | Public entry modules, paths **relative to this group's folder**. Omit to auto-detect `index.ts` / `index.tsx` in that folder. |
| `match` | Membership globs (joined onto group folder) or `/regex/` on the **full repo-relative path**. |
| `files` | Explicit module paths, **relative to group folder**. |
| `groups` | Child group **ids** — composes/nests children; parent does **not** claim their leaf modules. |
| `exclude` | Globs subtracted from this group's claim (a filter, not a membership source). |
| `ignore` | **Root group only.** Extra ignore globs merged with built-in defaults. |
| `descriptionShort` | One-line summary (see length rules below). |

### Membership rules (critical)

1. **Folder ownership (default):** If `match`, `files`, and `groups` are all absent/empty, the group claims every parsed source file **anywhere under its directory** (recursive). When nested folders also have folder-ownership groups, the **innermost** (deepest) group wins for files in that subtree.
2. **No overlap:** Each module belongs to **at most one** group. If two groups claim the same file → overlap error and the module stays ungrouped. Fix by adding `exclude` on the group that should cede the file.
3. **Composition:** `groups: [core, services]` nests those groups under this one for display. The parent claims **no leaf modules** unless it also has `match`/`files`/folder ownership.
4. **Cross-cutting modules:** Pull shared files with `match` or `files`, and add matching `exclude` on every folder-ownership group that would otherwise claim them.
5. **Facades:** When a deep module exists, list its facade explicitly. A group with **no** facade is fully public — imports into any member are allowed (no facade-bypass warnings).
6. **Root config-only group:** To set `ignore` without claiming files, use `match: ["/$^/"]` (regex that matches nothing).

### Path rules

- All paths in frontmatter are **POSIX**, repo-relative, forward slashes.
- `files` and `exclude` entries are relative to the **group file's directory**.
- `match` globs are also joined onto the group directory; `/regex/` patterns match the full repo-relative path as written.

---

## Format reference — `@Architecture(...)`

### Placement

- **First line** of the source file (before imports/code).
- Only **one** block is read (the first `@Architecture(...)` in the file).
- Use `//` line comment for most files; use a block comment only when the file already opens with `/**`.

### Syntax

```ts
// @Architecture(descriptionShort="Redux-like store managing state changes")
```

Multi-key (quote values that contain commas):

```ts
// @Architecture(type=Module, descriptionShort="HTTP transport", descriptionLong="Single choke point for network access; services depend on this, not fetch.", icon="globe")
```

**Parsing rules:**
- Format: `@Architecture(key=value, key="quoted value", ...)`
- Supported keys: `type`, `group`, `descriptionShort`, `descriptionLong`, `icon`
- Unknown keys are ignored. Malformed blocks are skipped silently.

### Supported keys

| Key | When to use |
|-----|-------------|
| `descriptionShort` | **Always.** The one line shown on the canvas and inspection panel. |
| `descriptionLong` | Rarely — only when the module needs extra context beyond the short line (inspection panel only). |
| `type` | Optional role label (e.g. `Module`, `controller`, `util`, `hook`). |
| `group` | Override group id — **avoid**; fix grouping in `*.group.md` instead. |
| `icon` | Same icon set as groups; use sparingly for distinctive modules. |

---

## Writing style and length (important)

CodeChart renders `descriptionShort` inside small graph nodes. Long text is truncated or wraps awkwardly. Follow these targets:

### `descriptionShort` (groups and modules)

| Target | Guidance |
|--------|----------|
| **Length** | **5–12 words**, roughly **35–70 characters**. Never exceed ~90 characters. |
| **Shape** | Verb-first or noun phrase: what it **does**, not its file or folder name. |
| **Tone** | Present tense, no fluff, no "This file…" / "This module…". |
| **Punctuation** | No trailing period (matches existing metadata style). |
| **Avoid** | File names, path segments, generic "handles logic", duplicating the group summary on every child file. |

**Good module examples:**
- `Manages global project, layout, and selection states`
- `Single choke point for network access`
- `Registers custom node views for groups, modules, and symbols`
- `Parses YAML frontmatter and body from a single group.md file`

**Good group examples:**
- `Domain types & state`
- `React Flow map renderer`
- `Files → nested group tree` (arrow OK for compact relationships)

**Bad:**
- `store.ts` (filename)
- `Core folder` (path, not responsibility)
- `This module contains utility functions for working with colors and themes in the application` (too long)

### `descriptionLong`

| Context | Target |
|---------|--------|
| **Group body** (`*.group.md`) | **2–4 sentences**, ~40–120 words. State: (1) responsibility, (2) public surface / facade, (3) what stays private, (4) optional cross-cutting note. Plain prose paragraphs — no bullet lists unless the user asked. |
| **Module `@Architecture`** | **Optional.** If present: **1–2 sentences**, max ~200 characters. Only when `descriptionShort` cannot carry enough nuance. Most modules need **only** `descriptionShort`. |

### Group `label`

- **1–4 words**, title case: `Graph Canvas`, `Core Services`, `Backend Shell`.

### Colors and icons

- Assign one distinct `color` per sibling group when possible.
- Pick `icon` by metaphor (e.g. `plug` for IO/adapters, `layers` for rendering, `database` for persistence, `panel` for UI shells).

---

## Complete examples (copy patterns, not ids)

### A — Folder ownership (most common)

`src/core/core.group.md`:

```md
---
id: core
label: Core
color: "#7c3aed"
icon: cube
facades:
  - index.ts
descriptionShort: Domain types & state
---

Domain model and in-memory state. Pure logic with no I/O or UI. Code outside this group must go through the facade (index.ts); store, todo, validate, and everything under Private/ stay private in this same group.
```

Folder ownership claims every parsed file under `src/core/` recursively — including `Private/**` — in **one** group. Do not add a separate group file inside `Private/`.

### A2 — Deep module with `Private/` (single group)

`src/features/sidebar-drop-logic/sidebar-drop-logic.group.md`:

```md
---
id: sidebar-drop-logic
label: Sidebar Drop Logic
color: "#eab308"
icon: hook
facades:
  - index.ts
descriptionShort: Drag-drop reorder geometry & execution
---

Drag-drop geometry and reorder helpers. Callers use index.ts; container-handlers, drop-execution, and the rest of Private/ are implementation in this same group.
```

All of these paths belong to **one** group: `index.ts`, `Private/container-handlers.ts`, `Private/drop-execution.ts`, etc. No `Private/private.group.md`.

### B — Composition parent (no direct leaf membership)

`app.group.md`:

```md
---
id: app
label: Application
color: "#64748b"
icon: app-window
groups:
  - core
  - services
  - ui
ignore:
  - node_modules/**
  - dist/**
descriptionShort: Todo application
---

Top-level container composed from the core, services, and ui groups via group references. Claims no leaf modules directly — entrypoints outside those groups stay ungrouped unless assigned elsewhere.
```

### C — Cross-cutting group (requires `exclude` elsewhere)

`shared.group.md` at repo root:

```md
---
id: shared
label: Shared
color: "#f59e0b"
icon: share
match:
  - "src/**/types.ts"
files:
  - src/core/todo.ts
descriptionShort: Cross-cutting types
---

Shared type modules pulled from multiple folders. The core and services groups cede these files via exclude so claims stay disjoint. No facade — members are public to every group.
```

Matching cessions in folder groups:

```md
exclude:
  - todo.ts    # ceded to shared
```

### D — Root project config (ignore only)

`my-app.group.md`:

```md
---
id: my-app
label: My App
match:
  - "/$^/"
ignore:
  - tests/**
descriptionShort: Monorepo root
---

Project-wide ignore rules. The tests/ tree holds Vitest suites — excluded from analysis when opening the repo root.
```

### E — Module annotation

`src/services/http.ts`:

```ts
// @Architecture(descriptionShort="Single choke point for network access", icon="globe")
```

`src/core/store.ts`:

```ts
// @Architecture(descriptionShort="Redux-like store managing state changes")
```

---

## Workflow

### Phase 1 — Explore (read-only, inside `{PROJECT_ROOT}` only)

1. List every parsed source file (`.ts`, `.tsx`, `.mts`, `.cts`, `.rs`), respecting built-in ignores and user constraints.
2. Map folders to **deep modules** (facade + implementation), not to every subfolder. Treat `Private/` as part of its parent deep module, never as its own group.
3. Note existing `*.group.md` and `@Architecture` blocks — preserve good metadata; remove/fix any `Private/*.group.md` anti-patterns.
4. Draft a group plan: one group per deep module, composition parents, cross-cutting pulls, facades, and required `exclude` pairs. Flag any folder hosting multiple facades — those need explicit `match`/`files`, not folder ownership.
5. If boundaries are ambiguous, **show the plan and wait**. Otherwise proceed.

### Phase 2 — Write `*.group.md` files

Create or update group files following the format reference. Prefer folder ownership when **one deep module owns the whole directory tree**. Use explicit `match`/`files` when several deep modules share a folder. **Never** add group files inside `Private/`.

### Phase 3 — Add `@Architecture` to source modules

Add one block per module that lacks metadata. Default to **only** `descriptionShort` unless a module truly needs `descriptionLong`.

### Phase 4 — Self-check (no external tools required)

Before finishing, verify manually:

- [ ] Every `*.group.md` has valid `---` frontmatter.
- [ ] No module is claimed by two groups (trace `match`, `files`, folder ownership, and `exclude` together).
- [ ] Every `groups:` entry references an existing `id`.
- [ ] `files` / `exclude` / `facades` paths are relative to the correct group folder.
- [ ] `color` values are `#` + 6 hex digits; `icon` values are from the allowed set.
- [ ] Every `descriptionShort` is 5–12 words; group bodies are 2–4 sentences.
- [ ] Facades are listed (or auto-detectable) for deep modules.
- [ ] **No `*.group.md` inside `Private/` or other implementation-only folders.**
- [ ] **Each deep module is exactly one group** — facade + private files together, never a separate "private" child group.
- [ ] No `@Architecture` on `.group.md` files; no metadata added to non-parsed extensions.

---

## Deliverables

1. List of created/updated `*.group.md` files with a one-line rationale each.
2. Count of source files that received new `@Architecture` blocks (list them if fewer than ~20).
3. Any intentionally ungrouped modules and why.
4. Overlap / ambiguity notes if something could not be resolved cleanly.

Keep the diff minimal: group files + annotation lines only.
```

---

## Placeholders

| Placeholder | Example |
|-------------|---------|
| `{PROJECT_ROOT}` | `C:/Proyectos/my-app` or `.` |
| `{LANGUAGES}` | `TypeScript (React), Rust (Tauri backend)` |
| `{ARCHITECTURAL_NOTES}` | `Tauri app: React frontend in src/, Rust analysis in src-tauri/src/` |
| `{CONSTRAINTS}` | `Mirror existing deep modules; do not annotate tests/ or dist/` |
