# Language Adapter & Semantic Comments

**Status: implemented (Phase 2).** Source: `src-tauri/src/language_adapter/`,
`src-tauri/src/semantic_comments/`.

## Responsibility

Turn **one source file** into local, language-agnostic facts (`ParsedModule`).
No cross-file resolution happens here — the resolver (Phase 4) consumes these
facts. This is the `LanguageAdapter` seam from [TDD §6](../plans/TECHNICAL-DESIGN.md);
TypeScript was the first impl; C++ follows the same pipeline.

## Public surface

`language_adapter::`
- `trait LanguageAdapter { fn parse(&self, path, source) -> Result<ParsedModule, ParseError> }`
- `registry_for(ext) -> Option<Box<dyn LanguageAdapter>>` — pick by extension (`ts`/`tsx`/`mts`/`cts`/`rs`/`cs`/`css`/`cpp`/`cc`/`cxx`/`h`/`hpp`/`hxx`/`prefab`).
- `registry_for_path(path)` — convenience over the path's extension.
- Data: `ParsedModule`, `ParsedImport`, `ImportKind`, `CommentBlock`.

The TS impl (`typescript/`), Rust impl (`rust/`), C# impl (`csharp/`), and C++ impl (`cpp/`) are private behind the trait; tree-sitter never
leaks past this boundary.

## `ParsedModule`

| Field | Meaning |
|-------|---------|
| `path` | recorded verbatim from the caller (caller owns id derivation) |
| `imports` | `import ... from "m"` + bare side-effect imports |
| `reexports` | `export ... from "m"` (also dependency edges) |
| `exported_symbols` | locally-declared + re-exported names |
| `comments` | raw `CommentBlock`s (text + byte range) in source order |
| `signals` | event emit/listen `CommSignal`s in source order (Phase 9) |
| `implements` | interface names from `implements` clauses (`class Foo implements IBar`) or Rust `impl Trait for Type` (Phase 10) |
| `ipc_invokes` | Tauri `invoke("…")` command names, source order (TS; requires `@tauri-apps/api` import) |
| `ipc_commands` | `#[tauri::command]` handler names, source order (Rust) |
| `declared_namespace` | declared `namespace` for the file (C#) |
| `loc` | line count |

`ParsedImport` carries `specifier`, `kind` (`Default`/`Named`/`Namespace`/`SideEffect`),
`names` (original pre-alias names), `is_type_only`, `is_reexport`.

### Import/export forms handled (TDD §7)

`import X from`, `import { a, b as c } from` (keeps `a`,`b`), `import * as ns from`,
`import type { T } from`, side-effect `import "m"`, mixed `import D, { a } from`;
re-exports `export { x } from`, `export type { T } from`, `export * from`; local
exports (`const`/`function`/`class`/`interface`/`default`). Whole-statement
type-only detection (`import type` / `export type`); mixed inline `{ type X }` is
not split out (MVP). Dynamic `import()` is skipped.

### Rust forms handled

`mod child;` (file edge), `use crate::` / `self::` / `super::` / bare crate paths
(converted to `./`/`../` specifiers for the resolver), `pub use` re-exports, and
`pub fn`/`struct`/`enum`/`trait`/`type`/`const`/`static` exports. Trailing
UpperCase item names in `use` paths are trimmed to the parent module for specifier
resolution and recorded in `import.names` (seam importer index). `impl Trait for Type`
blocks populate `implements` with the trait's final path segment (e.g.
`crate::services::TodoStore` → `TodoStore`). Inherent `impl Type { }` blocks are
skipped. External crates (`serde`, `std`, …) are skipped when the path has no
`crate`/`self`/`super` prefix and does not resolve as an in-crate module. Inline `mod foo { ... }` and
`extern crate` produce no file edges.

### C# forms handled

`using` / `global using` (namespace specifier stored for the references pass),
`using Alias = …` (alias target's final segment in `import.names`),
file-scoped and block `namespace` declarations (`declared_namespace`), and
`public` classes/interfaces/structs/enums/records/delegates as exports.
Type names used in the file body populate `referenced_symbols` (types, bases,
`new` targets). `: IFoo` base lists populate `implements`. External namespaces
(`System`, …) produce no edges; in-project matches become solid `import` edges
via `references::csharp` — only to modules exporting referenced symbols, not
every file in the namespace.

### Unity prefab forms handled

Text YAML ( `%YAML` header) `.prefab` files via `unity_prefab/`:
`m_Script` guids, nested prefab guids (`m_SourcePrefab`, serialized prefab fields),
and custom `MonoBehaviour` serialized fields → `exported_symbols`. Resolution in
`references::unity` (see [unity-prefabs.md](./unity-prefabs.md)).

### CSS forms handled

Stylesheets (`.css`) via `css/`: relative `@import` rules (`@import "./x.css"`,
`@import url("./x.css") layer(...)`) become side-effect dependency edges.
External URLs are ignored.

### C++ forms handled

C++ sources (`.cpp`/`.cc`/`.cxx`/`.h`/`.hpp`/`.hxx`) via `cpp/`:
quoted `#include "…"` → relative side-effect edges (`./path` when not already
relative); angle-bracket `#include <…>` skipped (system/external). Top-level
and namespace-scoped `class`/`struct`/`enum`/`union` names and function
declarations/definitions populate `exported_symbols`. `: Base, IFoo` base lists
populate `implements`. Resolution uses the standard relative-import pass with
`.cpp`/`.h`/`.hpp` extension candidates.

## `semantic_comments::parse_annotations(text) -> Vec<Annotation>`

Scans arbitrary text for `@Architecture(key=value, key="quoted value", ...)`
blocks. Recognized keys → `Annotation`: `type`, `group`, `descriptionShort`,
`descriptionLong`, `icon`. Quotes protect commas inside values; unknown keys are
ignored; empty/unterminated blocks degrade to no annotation (never panics).

**Decoupling:** the adapter only captures raw comment text; annotation parsing is
a separate pure module (no tree-sitter dependency). Callers (CLI / `analysis`)
feed file text or comment text to `parse_annotations`. Annotations are used in
Phase 10; parsing landed now since the adapter already walks comments.

## Determinism

Single ordered top-level walk → output preserves source order. No timestamps/random.

## Checkpoint (CLI)

From the repo root:
`cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- parse <file.ts|tsx|rs|cs|cpp|h>`
prints imports, re-exports, exported symbols, and annotations. (`codechart-cli` is
a `[[bin]]` of the `codechart` package in `src-tauri/`, so it's `--bin codechart-cli`,
not `-p codechart-cli`; `--manifest-path` lets paths stay repo-relative.) Verified
against `services/http.ts` (annotation) and `ui/App.tsx` (3 imports).
