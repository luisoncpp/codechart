# Import-cycle detection (circular dependencies)

**Status: plan for review — do not implement until accepted.**

## What this is in CodeChart language

The request is **import-cycle detection**: find loops among **modules** connected by solid **import edges** in the `ProjectGraph`, and surface them as **diagnostics**.

That is **not** the existing **group parent cycle** check (`detect_group_cycle` in `contract/validate.rs`). That one rejects a broken **group tree** (`parentId` loop) as `BuildError::SiblingOverlap`. It never looks at imports.

It is also **not** **facade bypass**. That is `flag_drift` → `isViolation` + `architectureViolation` (red edges, **FacadeBypassList** in the toolbar).

| User phrase | CodeChart name | Exists today |
|-------------|----------------|--------------|
| Circular dependency | **Import cycle** (SCC of `kind === "import"` edges) | No |
| Group containment loop | **Group parent cycle** | Yes — builder invariant |
| Illegal private import | **Facade bypass** / `architectureViolation` | Yes — Phase 8 |

## Goal

After analyze, every import cycle is a first-class **diagnostic** (D5), visible without hunting the canvas:

1. Backend finds cycles as a **post-pass** over resolved import edges (same pattern as `flag_drift`).
2. Each participating **module** lists the cycle in the **InspectionPanel**.
3. Cycle **import edges** are distinct on the canvas (not the same red as facade bypass).
4. A toolbar chip lists every cycle, copyable, like **FacadeBypassList**.

## Product decisions (proposed)

Accept or reject these before implementation. Recommendations are marked **(rec)**.

### Graph that is searched

- **(rec)** Only solid `kind = import` edges. Skip `soft` (events, interface seams, Tauri IPC, Unity). Those are runtime/semantic seams, not compile-time coupling.
- **(rec)** Include test modules. Unlike `flag_drift`, a test↔production cycle is a real import cycle. **Hide tests** already drops them from the canvas.
- **(rec)** Include C++ header↔header cycles. Do not special-case `.h`/`.cpp`. A `.cpp` including its own `.h` is not a cycle.
- **(rec)** Include self-imports (`A → A`) as a one-module cycle.
- **(rec)** Module granularity only for MVP. No separate group-level cycle finder. Cross-group cycles still show as module cycles; at L0, intra-group cycles disappear because collapsed self-loops are dropped (existing zoom reduction). Group-level cycle badges can be a follow-up.

### What counts as one finding

- **(rec)** One finding per **strongly connected component (SCC)** with ≥2 modules, plus each self-loop. Do not enumerate every elementary cycle (exponential).
- Message includes a **canonical witness cycle** (rotated so the lexicographically smallest module id is first) and, when the SCC has extra members, the full member list.
- Example: `circular import: a.ts → b.ts → a.ts`.
- Dense SCC example: `circular import: a.ts → b.ts → a.ts (also c.ts)`.

### Diagnostics

- **(rec)** New `DiagnosticKind::CircularDependency` (`"circularDependency"`). Do **not** reuse `architectureViolation` — that kind is facade bypass, and **FacadeBypassList** filters on it.
- Severity: **warning** (same as unresolved import / facade bypass). The graph still builds (D5).
- **(rec)** One diagnostic **per participating module**, so `diagnosticsFor(graph, module.id)` shows it.
  - `id`: `circularDependency:<cycle-key>:<moduleId>`
  - `cycle-key`: SCC member ids sorted and joined (stable)
  - `moduleId`: that module
  - `edgeId`: that module's outgoing edge on the witness cycle (if any)
- Toolbar count = **number of SCCs**, not number of per-module diagnostics.

### Canvas

- **(rec)** Do **not** set `isViolation`. Red stays facade-bypass.
- **(rec)** Add `inCycle: bool` on `Edge`, `serde(default, skip_serializing_if = "is_false")` so the golden fixture's edges do not need rewriting. Projection copies it into RF edge data. New `EdgeRole` (e.g. `"cycle"`, distinct color from `#dc2626` violation and from import orange).
- Mark **every** import edge whose both ends sit in the same reported SCC (witness cycle + chords).
- Focus coloring still wins when a cycle module is selected (import orange / export blue), same as today's violation-vs-focus order.

### Toolbar / inspector

- New chip next to **FacadeBypassList**: `N circular dependencies`, same modal pattern (copyable messages). One line per SCC (dedupe by `cycle-key`), not one line per module diagnostic.
- **InspectionPanel** already renders diagnostics; color `circularDependency` like violations (or the cycle color).
- **(rec)** Chip text is not click-to-focus in MVP (FacadeBypassList is copy-only). Follow-up: click a cycle → `focusOn` the first module.

### Golden fixture / sample project

- **(rec)** Do **not** plant a cycle in `tests/fixtures/ts-basic-project/`. The sample already has a planted facade bypass; a planted cycle would make the demo look broken.
- Cover detection with Rust unit tests on synthetic edges. Cover UI with a constructed `ProjectGraph` in vitest (same as other panel/canvas tests).
- Optional later: a tiny `tests/fixtures/ts-cycle-project/` if we want a CLI visual checkpoint.

## Architecture

### Backend — `references` post-pass

New file `src-tauri/src/references/cycles.rs`, exported from the `references` deep module. Public surface:

```text
flag_cycles(edges: &mut [Edge]) -> Vec<Diagnostic>
```

Same shape as `flag_drift`: one argument, mutate `in_cycle` in place, return diagnostics.

Wire in `analysis::resolve_edges` **after** `flag_drift` and **before** soft/IPC/Unity classifiers, so only import edges exist yet (or filter `EdgeKind::Import` regardless). Soft edges appended later must not be walked.

Algorithm:

1. Build adjacency from import edges (`BTreeMap` / `BTreeSet` for determinism).
2. Tarjan (or Kosaraju) SCC.
3. Keep SCCs with size ≥ 2, plus size-1 nodes that have a self-edge.
4. For each SCC, compute a canonical witness cycle (start at min id; deterministic DFS preferring lexicographically smallest unused target in the SCC).
5. Set `in_cycle` on every import edge with both ends in that SCC.
6. Emit one diagnostic per member.

Keep `cycles.rs` under 200 lines; functions under 30 lines; no function with more than 3 parameters (`GUIDELINES.md`).

`resolve_references` stays pure and group-agnostic (lesson: `edge-classifiers-are-post-passes-not-in-resolve.md`).

### Contract

- `DiagnosticKind` += `CircularDependency`.
- `Edge` += `in_cycle` (default false, omit when false).
- `npm run check` regenerates `src/domain/graph/model/*` via ts-rs. Do not hand-edit those files.

No `ProjectGraphBuilder` invariant change. Cycles are legal graphs; they are findings, not `BuildError`.

### Frontend

| Piece | Change |
|-------|--------|
| `domain/graph/Private/selectors.ts` | `circularDependencies(graph)` → one diagnostic per SCC (dedupe by id prefix / cycle-key). |
| `features/project_loader` | `CircularDependencyList` beside `FacadeBypassList`. Extract shared modal chrome only if it stays a thin copy; do not invent a generic diagnostics-modal framework. |
| `features/inspection_panel/Private/DiagnosticsList.tsx` | Color `circularDependency`. |
| `features/graph_canvas/Private/edges/edge-style.ts` | New role when `data.inCycle` and not focused/diff/violation. |
| `domain/graph/Private/projection/rf-projection-edges.ts` | Copy `inCycle` into edge data. |
| `domain/graph/Private/reduction/zoom-edge-reduction.ts` | When collapsing, `inCycle` survives a merge the same way `isViolation` does (`OR`). |

### Docs after implementation

- `docs/architecture/references-analysis.md` — new `flag_cycles` section.
- `docs/architecture/contract.md` — `DiagnosticKind` + `inCycle`.
- `docs/architecture/graph-canvas.md` — cycle edge role + toolbar chip.
- `docs/flows/analyze-project.md` — step after `flag_drift`.
- New flow `docs/flows/inspect-circular-dependency.md` (toolbar chip / select module → diagnostics).
- `docs/live/current-status.md` — implemented.
- Move this file to `docs/plans/done/` when shipped.
- `docs/plans/TECHNICAL-DESIGN.md` — add the kind to the `DiagnosticKind` union (the living contract sketch).

No new flow if we only emit diagnostics and never add a user action — but the toolbar chip **is** a user action, so a short flow is warranted.

## Tests

### Rust (`references/tests.rs` or `cycles.rs` `#[cfg(test)]`)

- No cycle → no diagnostics, no `in_cycle`.
- Pair `A ↔ B` → one SCC, two module diagnostics, both edges `in_cycle`, witness `A → B → A` (A < B).
- Triangle `A → B → C → A`.
- Self-import.
- Chord in an SCC: extra edge also `in_cycle`; still one SCC / one toolbar finding.
- Soft-looking edges ignored if present (kind filter).
- Two disjoint cycles → two cycle-keys.
- Determinism: same edges in any input order → identical diagnostic ids and messages.

### Analysis

- Golden `analyze_matches_the_golden_fixture` still exact (no planted cycle).

### Frontend

- Selector dedupes per-module diagnostics down to SCC count.
- Toolbar chip hidden at 0; shows `1 circular dependency` / `N circular dependencies`.
- Inspection panel lists the message on a participating module.
- `styleEdge`: `inCycle` gets the cycle color when unfocused; focus still overrides; `isViolation` still red and is not used for cycles.

## Out of scope (MVP)

- Auto-layout that pulls cycle members together.
- Click-to-focus from the cycle list.
- Group-level cycle summary / L0 badges.
- Config to ignore paths or allow listed cycles.
- Treating type-only TS imports differently (they are already import edges if the adapter recorded them).
- Suggesting how to break the cycle.

## Implementation order (after approval)

1. Contract: `CircularDependency` + `in_cycle`.
2. `flag_cycles` + Rust tests (TDD: tests fail, then pass).
3. Wire `resolve_edges`; confirm golden still matches.
4. Selectors + toolbar chip + inspector color + edge style.
5. Frontend tests.
6. Docs listed above.
7. `npx fallow audit`.
