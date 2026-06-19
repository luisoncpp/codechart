# Implementation Plan: Trama Vision MVP

Companion to [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md). Goal of the MVP (decision D3): point the
app at one TypeScript project and render the nested, colored, solid/dashed-edge diagram in the style of
`sample-img/img1.png`, including red drift violations.

This plan is built around two principles the user asked for:
1. **Every phase is gated by tests.**
2. **Every phase ends with a checkpoint the user can verify by eye** — so we catch derailment early,
   not at the end.

---

## The verification toolkit (how we stay on track)

These artifacts exist *before* feature work and are the rails for the whole project:

1. **Reference sample project** — `fixtures/sample-project/`: a small (~10–15 file) TypeScript project
   with deliberate structure: nested groups, one facade per group, an event-emitter seam, and **one
   intentional architectural violation** (a cross-group import bypassing a facade). Small enough to
   reason about fully.
2. **Golden `GraphModel` JSON** — `fixtures/golden/graph-model.json`: the *hand-authored* expected
   analysis output for the sample project. This is the North Star **data**. Both Rust and TS test
   suites diff against it. The user can read this file and confirm "yes, that's the graph I expect."
3. **The sample image** — `sample-img/img1.png` is the North Star **visual**. Phase 6 renders the
   sample project and we compare side-by-side.
4. **Mock-first frontend** — the UI is built against the golden JSON via `MockAnalysisClient` (seam,
   TDD §6) so it progresses even before the Rust pipeline is finished, and vice versa.
5. **Per-phase demo command** — each backend phase exposes a tiny dev CLI (`cargo run -- <subcommand>`)
   that prints intermediate output, so the user can inspect parsing/grouping/edges without a UI.

**Anti-derail rule:** a phase is not "done" until its tests pass *and* its checkpoint output has been
eyeballed against the relevant North Star. If a checkpoint diverges, stop and reconcile before moving on.

---

## Phase 0 — Skeleton & harness

**Goal:** both toolchains run, tests run, a hardcoded `GraphModel` flows Rust → IPC → React.

- Scaffold Tauri + React + TS + Vite; set up `cargo test`, `vitest`, lint, and a single `npm run check`
  that runs both test suites + lint.
- Empty `graph_model` (Rust) + `core/graph-model` (TS) with the §3 types; **contract test** stub.
- `ProjectSource` trait + `FsProjectSource` + `MemoryProjectSource`.
- `AnalysisClient` interface + `MockAnalysisClient` returning a tiny hardcoded model.

**Tests:** contract test parses a trivial `GraphModel` JSON on both sides; smoke test for each suite.
**Checkpoint (user-verifiable):** `npm run tauri dev` opens a window that renders "N modules, M edges"
from a model that originated in Rust. Proves the IPC pipe and both test runners work.

---

## Phase 1 — Graph model + the golden fixture

**Goal:** lock the contract and author the North Star.

- `GraphModelBuilder` (Rust) enforcing the four §2 invariants (reject sibling overlap, multi-facade,
  dangling edges, multi-group membership).
- Author `fixtures/sample-project/` and `fixtures/golden/graph-model.json` by hand.
- Contract test now loads the *real* golden JSON on both sides.

**Tests:** builder accepts the golden model; builder rejects each invariant violation (4 negative tests);
TS↔Rust contract test on the golden JSON.
**Checkpoint:** user reviews `fixtures/golden/graph-model.json` and the sample project together and
confirms the expected graph is correct. *Everything downstream is measured against this file.*

---

## Phase 2 — TypeScript language adapter (Rust)

**Goal:** extract local facts from real `.ts/.tsx` files.

- `LanguageAdapter` trait + `typescript` impl (tree-sitter-typescript): imports, re-exports, exported
  symbols, and raw comment-block ranges.
- `semantic_comments::parse_annotations` for `@Architecture(...)` blocks.

**Tests:** snippet fixtures → expected `ParsedModule` (import lists, export names); annotation parsing
incl. malformed/partial blocks; `MemoryProjectSource` feeds snippets so no disk needed.
**Checkpoint:** `cargo run -- parse fixtures/sample-project/<file>.ts` prints extracted imports +
annotations; user confirms the import list matches the file.

---

## Phase 3 — Group resolver + config

**Goal:** turn files + a config into the nested group tree with facades.

- `group_config` loader/validator (globs, regex, explicit lists, group references).
- `group_resolver`: assign modules to nested groups, designate the facade, **reject sibling overlap**.

**Tests:** each rule type matches correctly; nesting depth; facade designation; overlap rejection;
unmatched-file fallback behavior.
**Checkpoint:** `cargo run -- groups fixtures/sample-project` prints the group tree; user confirms it
matches the grouping in the golden fixture.

---

## Phase 4 — Reference resolver + drift → full `analyze_project` ⭐ main gate

**Goal:** the complete backend pipeline produces the golden model.

- `reference_resolver`: resolve imports to module ids → edges; classify **solid** (structural: import/
  instantiate within group) vs **dashed** (event token match, context, cross-group decoupling);
  pair emit/listen by matching identifier; set `isViolation` on facade-bypass crossings.
- `analysis::analyze_project` composes Phases 2–4.

**Tests:** edge-classification matrix (each trigger → expected kind); emit/listen pairing; drift
positive + negative cases.
**Checkpoint (⭐ the critical one):** `cargo run -- analyze fixtures/sample-project` output is **diffed
against `fixtures/golden/graph-model.json`** — must match exactly. This single assertion validates the
entire backend. If it fails, the backend is derailed; fix before touching the UI.

---

## Phase 5 — ELK layout (TS)

**Goal:** positions for a nested, non-overlapping diagram.

- `layout/elk-layout`: `GraphModel` → `LayoutResult` via `elkjs` with nested compound nodes.

**Tests (run against the golden model):** every module box is inside its group box; sibling groups don't
overlap; layout is deterministic (snapshot of positions); edges have endpoints.
**Checkpoint:** dev script dumps the layout to an SVG; user eyeballs that boxes nest correctly and
nothing overlaps. (Aesthetics come next phase; here we only check geometry.)

---

## Phase 6 — Render canvas: the sample aesthetic ⭐ visual gate

**Goal:** make it look like `sample-img/img1.png`.

- `render/graph-canvas` with React Flow: custom **group** node (colored container + header icon +
  label), **module** node, **facade** styling, **solid** vs **dashed** edges, **red** violation edges.
- `GraphSessionStore` + `useGraphSession` adapter.
- Storybook stories rendering the golden fixture at each future zoom level.

**Tests:** canvas renders the expected node/edge counts from the golden model; violation edges get the
alert style; `GraphSessionStore` unit tests (selection, zoom, load) with no DOM.
**Checkpoint (⭐):** Storybook renders the sample project; place it **side-by-side with
`sample-img/img1.png`**. Colors, nesting, icons, solid/dashed distinction should read the same. This is
the aesthetic acceptance gate.

---

## Phase 7 — Wire it end-to-end on a real project

**Goal:** the actual app, not fixtures.

- Replace `MockAnalysisClient` with `TauriAnalysisClient` calling the `ipc::analyze` command;
  `FsProjectSource` reads from a user-chosen folder; a config file picker.

**Tests:** integration test invoking the Tauri command on `fixtures/sample-project` returns the golden
model end-to-end.
**Checkpoint:** in the running app, open the real sample project folder → live diagram appears, **and the
intentional violation renders red**. MVP is functionally complete here.

---

## Phase 8 — Semantic zoom (L0/L1/L2)

**Goal:** the multi-level detail from spec §3.3 on top of the working graph.

- Pure `project(model, collapsedGroups)` projection (TDD §7): L0 collapses groups to facades and
  re-routes external edges; L1 expands; L2 renders code snippets (uses adapter source ranges).

**Tests:** projection unit tests (collapsed group → edges re-route to `facadeModuleId`; counts shrink).
**Checkpoint:** user zooms the app through L0→L1→L2 and sees collapse/expand + snippet rendering.

---

## Definition of done (every phase)

- [ ] New/changed behavior has tests; they pass (`npm run check`).
- [ ] Lint passes.
- [ ] The phase checkpoint output was compared to its North Star and matches.
- [ ] Architecture doc updated: when a subsystem stabilizes, move its section from this plan into
      `docs/architecture/` (per `docs/UPDATE.md`); add a flow doc if a new end-to-end sequence appeared.
- [ ] `docs/live/current-status.md` updated with what now works.

---

## Roadmap (post-MVP, each maps to an existing seam)

| Feature (spec ref) | Seam it extends |
|--------------------|-----------------|
| Narrative diff visualizer (§3.4) | new render overlay + diff input to `analyze_project` |
| Git time-travel (§3.5) | new `ProjectSource` over git revisions |
| Activity heatmaps (§3.5) | extra fields on `ModuleNode.metrics` + render layer |
| Global symbol resolution / LSP / stack-graphs | upgrade inside `reference_resolver` |
| C++ support | new `LanguageAdapter` impl |
| Embedded markdown reader (§3.2) | new panel beside `GraphCanvas` |
| Million-node WebGPU rendering | new `LayoutEngine` + renderer behind existing seams |

---

## Suggested working order & checkpoints summary

Backend (Phases 1→4) and frontend (Phases 5→6) can proceed **in parallel** once Phase 1 fixes the
golden fixture, because both sides target that file. The two critical gates are **Phase 4** (backend
matches golden data) and **Phase 6** (UI matches the sample image); Phase 7 joins them.
