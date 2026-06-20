# Codechart — Implementation Plan (canonical)

Companion to [`TECHNICAL-DESIGN.md`](./TECHNICAL-DESIGN.md). Goal of MVP Milestone 1 (decision D3):
point the app at one TypeScript project and render the nested, colored, edge-bearing diagram in the
style of [`sample-img/img1.png`](../../sample-img/img1.png), with a usable inspection panel and
visible diagnostics.

Built around the two properties the user asked for:

1. **Every phase is gated by tests.**
2. **Every phase ends with a checkpoint a human can verify by eye** — so derailment is caught early,
   not at the end.

---

## The verification toolkit (the rails)

These artifacts exist *before* feature work and anchor the whole project:

1. **Reference sample project** — `tests/fixtures/ts-basic-project/`: a small (~12–15 file) TS project
   with deliberate structure: 2–3 responsibility groups, ≥1 facade per group, a short import chain
   (to prove direction & layout), **one unresolved import** (diagnostics), **one intentional facade
   bypass** (Phase 8 violation), and **one `@Architecture` comment block** (Phase 10/metadata).
2. **Golden `ProjectGraph` JSON** — `tests/fixtures/golden/project-graph.json`: the hand-authored
   expected analysis output. The **North Star data**. Both Rust and TS suites diff against it. The
   user can read it and confirm "yes, that's the graph I expect."
3. **The sample image** — `sample-img/img1.png` is the North Star **visual** (Phase 6 acceptance gate).
4. **Mock-first frontend** — UI builds against the golden JSON via `MockAnalysisClient`, so frontend
   progresses before the Rust pipeline is finished (and vice versa).
5. **Per-phase dev CLI** — `cargo run -p codechart-cli -- <parse|groups|analyze> <path>` prints
   intermediate output, so parsing/grouping/edges are inspectable with no UI.
6. **Screenshots** — saved after the canvas exists, compared run-to-run to catch visual drift.

**Anti-derail rule:** a phase is not "done" until its tests pass *and* its checkpoint output has been
eyeballed against the relevant North Star. If a checkpoint diverges, stop and reconcile before moving on.

**Trust the JSON before the pixels:** never start UI polish on data the golden fixture hasn't confirmed.

---

## Phase 0 — Skeleton & harness

**Goal:** both toolchains run, tests run, a hardcoded `ProjectGraph` flows Rust → IPC → React.

- Scaffold Tauri + React + TS + Vite. Create the deep-module folders from TDD §9 as empty
  `index.ts`/`mod.rs` stubs (no logic) so boundaries exist from day one.
- One `npm run check` that runs `cargo test` + `vitest` + typecheck + lint.
- `contract` (Rust) with the §3 types + `ts-rs` derive; generate the TS mirror into `domain/graph`.
- `ProjectSource` trait + `FsProjectSource` + `MemoryProjectSource`.
- `AnalysisClient` interface + `MockAnalysisClient` returning a tiny hardcoded model.
- App opens to a **project-loader screen** (not a marketing page).

**Tests:** contract test parses a trivial `ProjectGraph` JSON on both sides; smoke test per suite.
**Checkpoint:** `npm run tauri dev` opens a window rendering "N modules, M edges, D diagnostics" from a
model that originated in Rust. Proves the IPC pipe, the `ts-rs` generation, and both runners.

---

## Phase 1 — Contract + golden fixture ⭐ locks the North Star

**Goal:** lock the contract and author the reference data.

- `ProjectGraphBuilder` (Rust) enforcing the five §2.2 invariants (reject sibling overlap, foreign
  facade, dangling edge, multi-group membership, non-deterministic ids).
- Author `tests/fixtures/ts-basic-project/` and `tests/fixtures/golden/project-graph.json` by hand.
- Contract test loads the *real* golden JSON on both sides.

**Tests:** builder accepts the golden model; builder rejects each invariant violation (negative tests);
TS↔Rust contract test on the golden JSON.
**Checkpoint:** user reviews the sample project and `golden/project-graph.json` together and confirms
the expected graph (module count, edges, groups, the planted unresolved import) is correct.
*Everything downstream is measured against this file.*

---

## Phase 2 — TypeScript language adapter (Rust)

**Goal:** extract local facts from real `.ts/.tsx` files.

- `LanguageAdapter` trait + `typescript` impl (tree-sitter-typescript): the import forms in TDD §7,
  re-exports, exported symbols, and raw comment-block ranges.
- `semantic_comments::parse_annotations` for `@Architecture(...)` blocks (used in Phase 10; parsing
  lands now since the adapter is already walking comments).

**Tests:** snippet fixtures → expected `ParsedModule` (import lists, export names) covering every §7
import form; annotation parsing incl. malformed/partial blocks; fed via `MemoryProjectSource` (no disk).
**Checkpoint:** `cargo run -p codechart-cli -- parse tests/fixtures/ts-basic-project/<file>.tsx` prints
extracted imports + annotations; user confirms the import list matches the file.

---

## Phase 3 — Config + grouping (Rust)

**Goal:** turn files + a config into the nested group tree with facades.

- `project_config`: discover co-located `*.group.md` files; parse YAML frontmatter (id, label,
  color, icon, facades, descriptionShort; membership via `match`/`files`/`groups`/`exclude`;
  root-only `ignore`) + markdown body; validate. Body + frontmatter → `GroupNode.annotation` (TDD §7).
  Bad frontmatter → `configError` diagnostic (per file, partial results).
- `grouping`: assign modules by the membership sources (TDD §7) — **folder ownership** (default),
  **globs/regex** (`match`), **explicit file lists** (`files`), **group references** (`groups`, which
  roll up children) — then subtract `exclude`. **Claims must be disjoint: any module claimed by two
  groups is an overlap → `configError` + builder rejection (no precedence)**; cross-cutting pulls
  require the owner to cede via `exclude`. **Nesting (`parentId`)** from the directory tree *or*
  explicit `groups` refs; designate facade(s) (default `index.ts`/`index.tsx`); **folder inference**
  when no `*.group.md` exists.

**Tests:** frontmatter parse (full/minimal/malformed); body→annotation; **each membership source**
(folder ownership, glob, regex, explicit file, group reference) + combinations; `exclude` as a
filter on folder ownership; cross-folder pull made disjoint by the owner's `exclude`; **overlap
(two groups claim one module) → `configError` + rejection**; nested `*.group.md` and explicit
`groups` ref both set `parentId`; facade default vs explicit; unmatched-file fallback;
no-group-files folder inference.
**Checkpoint:** `cargo run -p codechart-cli -- groups tests/fixtures/ts-basic-project` prints the group
tree; user confirms it matches the grouping in the golden fixture.

---

## Phase 4 — References + diagnostics + `analyze_project` ⭐ backend gate

**Goal:** the complete backend pipeline produces the golden model.

- `references`: resolve relative imports to module ids → **solid `import` edges** (resolver rules §7);
  unresolvable relative imports → `unresolvedImport` diagnostics (and an optional ghost edge).
- `diagnostics`: normalize parse/config/import findings into `Diagnostic`s.
- `analysis::analyze_project` composes Phases 2–4 with **partial-results discipline** (a failing file
  becomes a `parseError`, the rest of the graph still builds).

*(Dashed/soft edges and `isViolation` are reserved here — contract supports them; analyzers land in
Phases 8–9.)*

**Tests:** resolver matrix (extensionless, explicit ext, index files, package → external); unresolved
→ diagnostic; partial-results (one broken file ⇒ graph still produced + 1 diagnostic).
**Checkpoint (⭐ critical):** `cargo run -p codechart-cli -- analyze tests/fixtures/ts-basic-project` is
**diffed against `golden/project-graph.json`** — must match exactly. This single assertion validates the
entire backend. If it fails, the backend is derailed; fix before touching the UI.

---

## Phase 5 — ELK layout (TS)

**Goal:** positions for a nested, non-overlapping diagram.

- `domain/layout`: `LayoutEngine` interface + `ElkLayoutEngine` (`elkjs`, nested compound nodes,
  deterministic presets — TDD §"layout presets"). ELK details private behind `index.ts`.

**Tests (against the golden model):** every module box is inside its group box; sibling groups don't
overlap; every node gets finite coordinates; layout is deterministic (positions snapshot).
**Checkpoint:** a dev script dumps the layout to an SVG; user eyeballs that boxes nest and nothing
overlaps. (Aesthetics come next phase; here we check geometry only.)

---

## Phase 6 — Render canvas: the sample aesthetic ⭐ visual gate

**Goal:** make it look like `sample-img/img1.png`.

- `features/graph_canvas` (React Flow): custom **group** node (colored container + header icon +
  label), **module** node, **facade** styling, **solid** import edges (dashed/violation styles stubbed
  for later), compact labels, category colors, sparing icons.
- `GraphSessionStore` + `useGraphSession` adapter; `GraphCanvasController`.
- `features/inspection_panel`: selected module path, group, facade status, imports, **imported-by**,
  diagnostics.

**Tests:** canvas renders expected node/edge counts from the golden model; `GraphSessionStore` unit
tests (selection, zoom, load, session phases) with no DOM; projection test (`GraphProjector` →
React Flow models); inspection shows imports/imported-by for a selected node.
**Checkpoint (⭐):** render the sample project side-by-side with `sample-img/img1.png`. Colors, nesting,
icons, density, and edge readability should read the same. Save a screenshot. This is the **aesthetic
acceptance gate** — if readability fails, fix style before moving on.

---

## Phase 7 — Wire end-to-end on a real project → **MVP M1 done**

**Goal:** the actual app, not fixtures.

- Replace `MockAnalysisClient` with `TauriAnalysisClient` calling `tauri_api::analyze_project`;
  `FsProjectSource` reads a user-chosen folder; folder picker + config detection.
- Session states wired: idle / loading / ready / failed / **empty (no TS files)**.

**Tests:** integration test invoking the Tauri command on the fixture returns the golden model
end-to-end; loader state-machine tests.
**Checkpoint:** in the running app, pick the sample folder → live diagram appears; pick an arbitrary
real TS repo → it produces a graph + diagnostics without crashing; refresh is layout-stable.
**MVP Milestone 1 is functionally complete here.**

---

## Phase 8 — Architecture drift detection (near-term fast-follow)

**Goal:** spec §3.1 — flag facade bypass.

- Extend config with private-group / allowed-facade rules. In `references`, an import from outside a
  group into a non-facade module sets `isViolation=true` + emits an `architectureViolation` diagnostic.
- Render violation edges **red**; explain them in the inspection panel.

**Tests:** allowed facade import (no flag); forbidden private import (flag + diagnostic); fixture's
planted violation; UI test selecting a violation edge. **No false positives** — user must be able to
explain every flag from the UI alone.
**Checkpoint:** the planted fixture violation renders red and is explained in the panel.

---

## Phase 9 — Dashed / soft edges

**Goal:** spec §2.4 — dynamic communication hooks.

- New classifier in `references`: event emit/listen by matching identifier token, React context
  provider/consumer, pub/sub tokens → `soft` edges (dashed).

**Tests:** emit/listen pairing matrix; each trigger → expected kind; render shows dashed.
**Checkpoint:** the fixture's event seam renders as a dashed edge between the right modules.

---

## Phase 10 — Semantic zoom (L0/L1/L2) + metadata rendering

**Goal:** spec §3.3 multi-level detail + `@Architecture` metadata surfaced.

- Pure `project(model, collapsedGroups)` projection (TDD §8): L0 collapses groups to facades and
  re-routes external edges; L1 expands; L2 renders code snippets (adapter source ranges).
- Render parsed `Annotation` (short/long description, icon) in nodes + inspection panel.

**Tests:** projection unit tests (collapsed group → edges re-route to facade; counts shrink); metadata
render + missing-metadata fallback.
**Checkpoint:** user zooms L0→L1→L2 and sees collapse/expand + snippets; metadata improves
comprehension without adding noise.

---

## Definition of done (every phase)

- [ ] New/changed behavior has tests; they pass (`npm run check`).
- [ ] Lint + typecheck pass.
- [ ] The phase checkpoint output was compared to its North Star and matches.
- [ ] Architecture doc updated: when a subsystem stabilizes, move its section from this plan into
      `docs/architecture/` (per `docs/UPDATE.md`); add a flow doc if a new end-to-end sequence appeared.
- [ ] `docs/live/current-status.md` updated with what now works.
- [ ] Notable surprises/constraints recorded in `docs/lessons-learned/`.

---

## MVP Milestone 1 — definition of done

- User picks one local TS/TSX project.
- Backend returns source modules, resolved import edges, and unresolved-import diagnostics, with
  partial results on file failures.
- Frontend renders the graph with React Flow + ELK, in the target architecture-map aesthetic.
- Layout is stable across refresh for the same input.
- Selected nodes show path, group, facade status, imports, and imported-by list.
- Empty / loading / failed / ready states exist.
- Tests cover scanner, parser, resolver, builder invariants, DTO projection, layout geometry, and
  basic UI states; the golden-fixture diff passes on both sides of the contract.

---

## Working order & the two critical gates

Backend (Phases 1→4) and frontend (Phases 5→6) can proceed **in parallel** once **Phase 1** fixes the
golden fixture, because both sides target that file. The two gates that catch derailment are:

- **Phase 4** — backend output matches the golden data (exact diff).
- **Phase 6** — UI matches the sample image (side-by-side).

Phase 7 joins them into the shipped app. Phases 8–10 are additive on the same contract — no rework.

---

## Roadmap (post-M1, each maps to an existing seam — TDD §11)

Narrative diff visualizer (diff input + render overlay); git time-travel (new `ProjectSource` over
revisions); activity heatmaps (`ModuleNode.metrics` + layer); global symbol resolution / LSP /
stack-graphs (upgrade inside `references`); C++ adapter (new `LanguageAdapter`); embedded markdown
reader (new panel); million-node WebGPU rendering (new `LayoutEngine` + renderer). All reuse the
`ProjectGraph` contract rather than forking the model.
