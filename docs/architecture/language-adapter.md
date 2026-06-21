# Language Adapter & Semantic Comments

**Status: implemented (Phase 2).** Source: `src-tauri/src/language_adapter/`,
`src-tauri/src/semantic_comments/`.

## Responsibility

Turn **one source file** into local, language-agnostic facts (`ParsedModule`).
No cross-file resolution happens here — the resolver (Phase 4) consumes these
facts. This is the `LanguageAdapter` seam from [TDD §6](../plans/TECHNICAL-DESIGN.md);
TypeScript is the first impl, C++ a future one with no pipeline change.

## Public surface

`language_adapter::`
- `trait LanguageAdapter { fn parse(&self, path, source) -> Result<ParsedModule, ParseError> }`
- `registry_for(ext) -> Option<Box<dyn LanguageAdapter>>` — pick by extension (`ts`/`tsx`/`mts`/`cts`).
- `registry_for_path(path)` — convenience over the path's extension.
- Data: `ParsedModule`, `ParsedImport`, `ImportKind`, `CommentBlock`.

The TS impl (`typescript/`) is private behind the trait; tree-sitter never
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
| `implements` | interface names from `implements` clauses (`class Foo implements IBar`) (Phase 10) |
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
`cargo run --manifest-path src-tauri/Cargo.toml --bin codechart-cli -- parse <file.ts|tsx>`
prints imports, re-exports, exported symbols, and annotations. (`codechart-cli` is
a `[[bin]]` of the `codechart` package in `src-tauri/`, so it's `--bin codechart-cli`,
not `-p codechart-cli`; `--manifest-path` lets paths stay repo-relative.) Verified
against `services/http.ts` (annotation) and `ui/App.tsx` (3 imports).
