# Reference fixture: `ts-basic-project`

A small TypeScript project that is the **test subject** for the whole analysis
pipeline. Its hand-authored expected analysis lives in
[`../golden/project-graph.json`](../golden/project-graph.json) — the North Star
that both the Rust and TS suites diff against.

## Structure

Three responsibility groups, each declared by a co-located `*.group.md` file
(YAML frontmatter + markdown body, per TDD §7) placed in the group's folder:

- **core** — `src/core/core.group.md`; domain types & state (`todo`, `store`, `validate`), facade `core/index.ts`.
- **services** — `src/services/services.group.md`; data access (`api`, `http`, `types`), facade `services/index.ts`.
- **ui** — `src/ui/ui.group.md`; React components (`App`, `TodoList`, `TodoItem`), facade `ui/index.ts`.

Each of the three owns its folder + subfolders (implicit folder ownership). A
fourth, **aggregate** group sits at the project root:

- **app** — `app.group.md`; composes core/services/ui via a `groups:` reference
  (membership-by-group-reference, not folder ownership). It claims no leaf module
  directly, so it nests the three (their `parentId` is `app`) while `src/main.ts`
  stays **ungrouped** (`groupId` null) — exercising both the nested-group path and
  the nullable-group path. Also carries the project-wide `ignore` globs.
- **shared** — `shared.group.md`; a top-level cross-cutting group with **no facade**
  (so it is public, §7) that pulls modules from two folders: `services/types.ts` via
  a glob (`match: src/**/types.ts`) and `core/todo.ts` via an explicit `files` entry.
  To keep claims **disjoint** (no overlap, §7), the `core` and `services` groups cede
  those files with `exclude: [todo.ts]` / `exclude: [types.ts]`.

So the fixture exercises **all four** membership sources (TDD §7): folder ownership
(core/services/ui), group references (app), and glob `match` + explicit `files`
(shared) — plus `exclude` as the carve-out that keeps cross-folder claims disjoint.
Regex `match` is left to Phase 3's dedicated unit-test fixtures.

### `*.group.md` → `GroupNode`

Frontmatter `id`/`label`/`color`/`facades` map to the matching `GroupNode` fields;
`descriptionShort`/`icon` plus the markdown **body** populate `GroupNode.annotation`
(`descriptionLong` = the body, trimmed). Fixture bodies are a single paragraph so
the golden `descriptionLong` is an exact one-line match; real groups may use long,
multi-section markdown. Phase 3 owns the final parser — if body-capture rules
change, update the golden group annotations to match.

## Deliberately planted facts (each unlocks a later phase)

| Seed | Location | Surfaces in |
|------|----------|-------------|
| Short import chain | `main → ui → ui/App → services → services/api → services/http` | direction & layout |
| Unresolved import | `services/api.ts` imports `./cache` (no such file) | `unresolvedImport` diagnostic (Phase 4) |
| Facade bypass | `ui/TodoList.tsx` imports `../core/store` (private) instead of `../core` | `architectureViolation` (Phase 8) |
| `@Architecture` block | `services/http.ts` header comment | metadata rendering (Phase 10) |

## Scope of the golden file (M1 / Phase 4 + Phase 8)

The golden output reflects what the analyzer is expected to produce:

- **Import edges** (`kind: "import"`) for every resolved relative import,
  including re-exports. All are `isViolation: false` **except** the planted
  facade bypass `ui/TodoList.tsx → core/store.ts`, which Phase 8 flags
  `isViolation: true`.
- **One `unresolvedImport` diagnostic** for `./cache`; no edge is emitted for it.
- **One `architectureViolation` diagnostic** (Phase 8) linked to the bypass edge
  + importer module (`src/ui/TodoList.tsx`).
- The `@Architecture` annotation parsed onto `services/http.ts`.
- **No `soft`/dashed edges** yet — the event/context classifier ships in Phase 9.

### Provisional `@Architecture` syntax

Phase 2 owns the final parser. The fixture uses a single-line form:

```
// @Architecture(key=value, key="quoted value", ...)
```

Recognized keys: `type`, `group`, `descriptionShort`, `descriptionLong`, `icon`.
If Phase 2 changes the syntax, update this comment and the golden annotation.

### LOC metric

`metrics.loc` is the physical line count of each file (matching Rust
`str::lines().count()`), computed from these files as authored. Re-derive it if a
fixture file changes.
