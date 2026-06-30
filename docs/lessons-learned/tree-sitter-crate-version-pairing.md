# tree-sitter crate version pairing & API shape

**What's counter-intuitive:** the `tree-sitter` runtime crate and each grammar
crate (`tree-sitter-typescript`, `tree-sitter-c-sharp`, …) are versioned
independently and only line up through the shared `tree-sitter-language` crate.
Mismatched majors fail to compile (or link) with opaque errors. The working
pair used here: `tree-sitter = "0.25"` + `tree-sitter-typescript = "0.23"` +
`tree-sitter-rust = "0.23"` + `tree-sitter-c-sharp = "0.23.5"` + `tree-sitter-cpp = "0.23.4"`.

**ABI 15:** `tree-sitter-c-sharp` 0.23.5 ships grammar ABI version 15, which
requires `tree-sitter >= 0.25`. Staying on 0.24 yields `LanguageError {
version: 15 }` at `set_language`.

**API shape (0.24 / 0.23):** grammars export a `LanguageFn` constant, not a
function — `tree_sitter_typescript::LANGUAGE_TYPESCRIPT` / `LANGUAGE_TSX`. Load
with `parser.set_language(&LANGUAGE_TYPESCRIPT.into())` (the `.into()` converts
`LanguageFn → Language`). TSX is a **separate grammar** from TS — pick by
extension; parsing `.tsx` with the TS grammar mis-parses JSX.

**Extraction notes for the next adapter (e.g. C++):**
- Imports/exports are top-level, so a single pass over the program's children is
  enough — no full-tree recursion needed.
- For named imports, the original identifier is `import_specifier`'s `name`
  field; the alias (`as c`) is a separate field — take `name` for dependency facts.
- Whole-statement `import type` / `export type` is detected from leading tokens;
  inline mixed `{ type X, y }` is **not** split per-specifier (deferred).

**Build cost:** grammar crates compile bundled C, so a C toolchain (MSVC on
Windows) must be present — already true here because Tauri needs one.
