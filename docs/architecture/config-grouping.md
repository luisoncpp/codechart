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
- `discover_group_defs_from(source, paths)` — same over a caller-filtered path list
  (analysis uses this after optional top-level dot-directory hiding).
- `retain_without_top_level_dot_dirs` / `is_under_top_level_dot_dir` — drop files
  under top-level directories whose names start with `.` (View ▾ **Hide dot directories**,
  default on, session-only; not the same as built-in ignore globs).
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
- `match` — globs joined onto and normalized against `dir` (so they may use `..`)
  or `/regex/` over the verbatim repo-relative path, `matcher.rs`.
- `files` — explicit paths joined onto `dir` and normalized, so they may use `..`.
- `exclude` — a **filter** (not a source) subtracted from the claim, so a group
  may fold-own *and* carve out (e.g. cede a file to a cross-cutting group).
- **Overlap is an error between competing explicit claims:** a module claimed by
  multiple explicit groups → `configError:overlap:<module>` and the module is
  left unassigned. A nested explicit group supersedes an ancestor's implicit
  folder-ownership claim; unrelated cross-cutting claims still require the
  folder owner to cede via `exclude`.

**Nesting / parentId (`nesting.rs`):** an explicit `groups` ref wins; otherwise
the nearest ancestor folder with a `*.group.md`. A `groups` ref sets the child's
parent and rolls its members up *for display only* — it never makes the module a
direct member of the parent (so `app`, composed only of `groups`, claims no leaf
module). **A composition group (any group with `groups` refs) never fold-adopts
folder descendants** (`can_fold_own`): it parents exactly the groups it names.
Without this, a root-level composition group (`dir = ""`, an ancestor of every
folder) would become the implicit parent of every group that lacks an explicit
parent. `exclude` is a *membership* filter only — it does not affect nesting.

**Facades:** explicit `facades` (must name group members, else
`configError:facade:…`), else default to `index.ts`/`index.tsx` in `dir` when
present. Facade paths are normalized like `files`, so they may use `..`. A
facade-less group is public (§10 drift never flags imports into it).

**Disconnect defaults:** `disconnected: true` marks the whole group disconnected
by default (canvas hides its edges on load). `disconnectedModules` lists module
paths (joined onto `dir`, like `files`) whose edges are hidden individually;
unknown paths → `configError:disconnect:…`. Resolved ids land on
`GroupNode.disconnectedByDefault` / `disconnectedModuleIds` in the contract.

**Folder inference (`infer.rs`):** with **no** `*.group.md` at all, infer one
`folder:<dir>` group per directory on the path from root to each file's parent
(including intermediate folders that only contain subdirectories), `index.ts/tsx`
facade, directory nesting for parentId.

### Sibling-facade deep modules

A group file in `domain/Widget/` can own both `domain/Widget.ts` and
`domain/Widget/**` with `facades: ["../Widget.ts"]` and
`match: ["../Widget.ts", "**"]`; `/regex/` is unnecessary. Relative globs,
explicit files, excludes, and facades are normalized after joining to the group
directory, so they may use `..`. The nested explicit claim supersedes the
ancestor's folder ownership automatically. Directory nesting then makes the
deep module a child of `domain` without `groups:`.

## Determinism

Defs sorted by id; claims/members in `BTreeMap`/`BTreeSet`; groups output sorted
by id. Same input → same tree.

## Checkpoint (CLI)

`cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- groups tests/fixtures/ts-basic-project`
prints the group tree (header counts, nested groups with members + facades,
ungrouped files). For the fixture: `app` nests `core`/`services`/`ui`, `shared`
pulls `core/todo.ts` + `services/types.ts` cross-folder, `src/main.ts` ungrouped —
matching `golden/project-graph.json`.
