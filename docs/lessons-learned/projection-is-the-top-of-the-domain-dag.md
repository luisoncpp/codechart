# The view model, not the data model, is the top of the domain DAG

`graph`, `diff` and `layout` looked like three peer deep modules, and each one's facade imported
the other two — one 40-module `circularDependency` cycle covering every file in all three:

```
graph/index.ts → graph/Private/projection/node-data.ts → diff/index.ts
               → diff/Private/apply-diff-overlay.ts    → graph/index.ts
```

## What was actually wrong

Not the data shapes — **two pieces of code were filed under the wrong module**:

| Misfiled code | Was in | Really belongs to |
|---------------|--------|-------------------|
| `rf-projection*`, `node-data` (the React Flow view model) | `domain/graph` | a layer **above** graph + layout |
| `apply-diff-overlay`, `apply-diff-review`, `apply-symbol-diff`, `place-ghost-modules` | `domain/diff` | the same layer (they stamp React Flow nodes) |

A module that *renders* `ProjectGraph` is not part of `ProjectGraph`. Once both were lifted into a
new `domain/projection` deep module, every remaining edge pointed one way and **not a single type
had to move or be duplicated** — no shared-vocabulary module, no `import type` escape hatch.

## The counter-intuitive part

The instinct ("extract the shared types into a lower module") is the wrong direction here. The
shared vocabulary was not `ProjectGraph`/`LayoutBox`/`FileLineDiff` — those already flowed one way.
It was `RFNode`/`ProjectedGraph`, a **view** model that all three data modules were reaching *up*
for. Pushing a view model down would have dragged `@xyflow/react` into the contract layer; pulling
the two view-stage file sets *up* cost four `git mv`s and an `index.ts`.

**Heuristic:** in a cycle between deep modules, look for the file whose imports point *outward in
both directions* (here `node-data.ts`: needed `Language` from graph, `LayoutBox` from layout,
`FileLineDiff` from diff). That file is almost always sitting one layer too low.

## Diagnosing it

`cargo run --bin codechart-cli -- check . --format=json` — text-format cycle lines are ~2KB each,
so filter the JSON. The one-line dependency map that made the fix obvious:

```sh
grep -rn '\.\./\.\./' src/domain/*/index.ts src/domain/*/Private/**/*.ts
```

`tests/domain-layering.test.ts` now encodes the allowed table and fails on any new back-edge —
cheaper than re-running the Rust analyzer, and it names the offending file.
