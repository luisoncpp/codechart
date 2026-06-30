# Config & Grouping

**Status: implemented (Phase 3).** Source: `src-tauri/src/project_config/`,
`src-tauri/src/grouping/`.

## Responsibility

Turn the file list + co-located `*.group.md` files into the **nested group tree**:
which module belongs to which group, each group's parent and facades, and
`configError` diagnostics for bad config. No imports/edges here (that's
`references`, Phase 4). Two pure deep modules feed `analysis`:

- `project_config` — discover + parse + validate `*.group.md` → `GroupDef`s.
- `grouping` — `resolve_groups(files, defs)` → `ResolvedGroups`.

## `project_config`

Public surface (`project_config::`):
- `GroupDef` — parsed config: id, label, `dir` (folder of the file, `""` = root),
  color, icon, `facades`, membership (`match_globs`/`files`/`group_refs`/`exclude`),
  root-only `ignore`, `description_short`/`description_long`, `disconnected` (hide all
  group connections by default), `disconnected_modules` (module paths relative to `dir`),
  `architecture_doc` (repo-relative path to extended markdown for L2 canvas).
- `parse_group_def(path, content) -> Result<GroupDef, ConfigError>` — one file.
- `discover_group_defs(source) -> (Vec<GroupDef>, Vec<Diagnostic>)` — walk a
  `ProjectSource`, parse every `*.group.md`, parse failures → `configError`s.
- `is_group_file(path)`, `config_error(path, msg)` helpers.

A `*.group.md` is **YAML frontmatter + markdown body**. Frontmatter parsing
(`parse.rs`, private) is forgiving: every field optional, unknown keys ignored,
defaults derived from the folder path. `description_long` = body;
`description_short` = frontmatter or first body paragraph. `architectureDoc` =
repo-relative path to extended markdown (stored on `GroupNode`, fetched lazily at
L2). Missing/invalid frontmatter → `ConfigError` (becomes a per-file `configError`, partial results).

## `grouping`

`resolve_groups(files, defs) -> ResolvedGroups` (`{ groups, module_group,
facades, diagnostics }`). Pure; deterministic (sorted iteration, `BTree*`).

**Membership (TDD §7), resolved in `claim.rs`:**
- A group with **no source** (`match`/`files`/`groups` all empty) defaults to
  **folder ownership** — files under its `dir`; innermost folder group wins.
- `match` — globs (joined onto `dir`) or `/regex/` (verbatim repo-relative path),
  `matcher.rs`.
- `files` — explicit paths joined onto `dir`.
- `exclude` — a **filter** (not a source) subtracted from the claim, so a group
  may fold-own *and* carve out (e.g. cede a file to a cross-cutting group).
- **Overlap is an error, never resolved:** a module claimed by ≥2 groups →
  `configError:overlap:<module>` and the module is left unassigned. No precedence;
  the owner must cede via `exclude`.

**Nesting / parentId (`nesting.rs`):** an explicit `groups` ref wins; otherwise
the nearest ancestor folder with a `*.group.md`. A `groups` ref sets the child's
parent and rolls its members up *for display only* — it never makes the module a
direct member of the parent (so `app`, composed only of `groups`, claims no leaf
module).

**Facades:** explicit `facades` (must name group members, else
`configError:facade:…`), else default to `index.ts`/`index.tsx` in `dir` when
present. A facade-less group is public (§10 drift never flags imports into it).

**Disconnect defaults:** `disconnected: true` marks the whole group disconnected
by default (canvas hides its edges on load). `disconnectedModules` lists module
paths (joined onto `dir`, like `files`) whose edges are hidden individually;
unknown paths → `configError:disconnect:…`. Resolved ids land on
`GroupNode.disconnectedByDefault` / `disconnectedModuleIds` in the contract.

**Folder inference (`infer.rs`):** with **no** `*.group.md` at all, infer one
`folder:<dir>` group per directory containing source files, `index.ts/tsx` facade,
directory nesting for parentId.

## Determinism

Defs sorted by id; claims/members in `BTreeMap`/`BTreeSet`; groups output sorted
by id. Same input → same tree.

## Checkpoint (CLI)

`cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- groups tests/fixtures/ts-basic-project`
prints the group tree (header counts, nested groups with members + facades,
ungrouped files). For the fixture: `app` nests `core`/`services`/`ui`, `shared`
pulls `core/todo.ts` + `services/types.ts` cross-folder, `src/main.ts` ungrouped —
matching `golden/project-graph.json`.
