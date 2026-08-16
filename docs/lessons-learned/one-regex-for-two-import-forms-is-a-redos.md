# Covering two import forms with one regex buys a repeated group — and a ReDoS

A specifier matcher that has to handle both `import { a, b } from "x"` and bare
`import "x"` naturally grows a repeated clause group:

```
^(?:import|export)\s+(?:(?:{[^}]+}|\*\s+as\s+[^,]+|[a-zA-Z0-9_$]+)\s*,?\s*)*(?:from\s+)?["']…
```

The `*` group is the trap. Its body can match a run of identifier characters and its
separator (`\s*,?\s*`) can match nothing, so `buildOverlayForStore` can be consumed as
one iteration, or two, or twenty — 2^n ways. That costs nothing while the pattern
*succeeds*; it costs everything when it fails, because failing means proving every
partition wrong. And the pattern fails on **every `export`/`import` line that is not an
import** — i.e. on every exported declaration in the codebase.

Measured on `export function <name>(x) {`, cost quadruples per 2 characters of name:

| name length | 14 | 16 | 18 | 20 | 22 | 26 |
|---|---|---|---|---|---|---|
| time | 48 ms | 196 ms | 806 ms | 3.3 s | 13 s | ~3.5 min |

`parseDiffImportEdges` runs the matcher once per `+`/`-` line, so an ordinary pasted
diff took minutes to visualize and a large one never finished. It looked like slow IPC
or a slow layout; it was one line of TypeScript in the diff text.

**The rule:** in a matcher that runs per line over arbitrary source, never nest an
unbounded quantifier whose body can match a variable-length run and whose separator can
match empty. Split into one linear pattern per form — `\bfrom\b` before the quote for
the clause form, a bare `^import\s*["']` for the side-effect form. Two patterns are not
duplication here; they are what keeps each one linear.

**Testing it:** a vitest `timeout` will not catch this. The stall is synchronous, so it
hangs the worker instead of failing the test. Assert elapsed time against a budget with
a wide margin (`tests/diff.test.ts` gives ~1000× headroom on the passing side and ~100×
on the failing one), and pick an input whose broken cost is seconds, not minutes.

Fixed in `src/domain/diff/Private/parse-diff-imports.ts`. The rewrite also picks up
`export * from "x"`, which the old pattern silently missed: `*` matched none of its
alternatives unless followed by `as`.
