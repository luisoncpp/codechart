# Import-cycle detection (circular dependencies)

**Status: plan for review — do not implement until accepted.**

**Audience focus: C++ / Unreal.** The first draft treated cycles as a generic
module-file SCC. That is wrong for the main use case: declaration and definition
live in separate files (`.h` / `.cpp`, often Unreal `Public/` vs `Private/`), and
a naive file walk either confuses readers or under-explains the real problem
(**header include cycles** between types).

## What this is in CodeChart language

**Import-cycle detection**: find loops in the solid **import** graph
(`kind = import` edges from `#include` / imports), and surface them as
**diagnostics**.

Not these existing checks:

| User phrase | CodeChart name | Exists today |
|-------------|----------------|--------------|
| Circular dependency | **Import cycle** | No |
| Group containment loop | **Group parent cycle** (`detect_group_cycle`) | Yes — builder error |
| Illegal private import | **Facade bypass** / `architectureViolation` | Yes — Phase 8 |

CodeChart already has a **same-stem C++ pair** notion used when copying header
exports onto an implementation module (`analysis/nodes.rs`:
`is_paired_cpp_header` — `.cpp`/`.cc`/`.cxx` → `.h`/`.hpp`/`.hxx` with the same
basename, including Unreal `Private/Player.cpp` → `Public/…/Player.h`). Cycle
detection must reuse that idea so declaration/definition split is not mistaken
for a cycle.

## Why file-only SCCs confuse C++ / Unreal

Typical Unreal edges look like:

```text
Source/Game/Private/Player.cpp  →  Source/Game/Public/Characters/Player.h
```

That is **one-way** and **not** a cycle. A naive SCC never flags it alone.
The confusion is elsewhere:

1. **Witness paths** that list both `Player.cpp` and `Player.h` as separate
   “modules” when the author thinks of one type / one compilation unit.
2. **Useful cycles** are almost always **header ↔ header**
   (`A.h → B.h → A.h`). `.cpp` files almost never appear in an SCC because
   nothing `#include`s a `.cpp`.
3. Authors care about cycles **between types** (logical units), not between a
   definition file and its own declaration file.

So MVP is **C++-aware unit collapsing**, not “treat every path as equal.”

## Goal

After analyze, every *meaningful* include cycle is a first-class diagnostic (D5):

1. Backend finds cycles as a `references` post-pass (peer of `flag_drift`).
2. Participating modules list the cycle in the **InspectionPanel**.
3. Cycle edges are distinct on the canvas (not facade-bypass red).
4. A toolbar chip lists every cycle, copyable, like **FacadeBypassList**.

## Product decisions (proposed)

Recommendations marked **(rec)**. Accept or reject before implementation.

### Primary language / project

- **(rec)** Design and test first for **C++ / Unreal** include graphs
  (`references/cpp.rs`, `unreal.knownPaths`, hidden `*.generated.h`).
- **(rec)** Still run the same pass on TS/Rust/C# import edges when present
  (no language gate). Pair-collapsing is a no-op outside C++ extensions.
- Engine / generated includes stay out of the graph already
  (`excludeEngineReferences`, `hideGeneratedFiles`) — no extra cycle rules.

### Graph that is searched — C++ logical units

- **Accepted:** Before SCC, collapse each **C++ same-stem pair** into one
  **logical unit**. Rejected alternative: headers-only graph (ignore `.cpp`).
  - Pair rule = existing `is_paired_cpp_header` stem match (Public/Private OK).
  - Unit id = the **header path** when a header is in the pair; else the sole
    file path (orphan `.cpp` / unpaired header).
  - An edge `Player.cpp → Player.h` becomes a **unit self-edge** and is
    **dropped** before SCC (never a finding).
  - An edge `Player.cpp → Enemy.h` becomes `Player.h → Enemy.h` (or
    `Player.cpp → Enemy.h` if Player has no paired header).
  - An edge `A.h → B.h` stays `A.h → B.h`.
- **Accepted:** Run SCC on that **unit graph**. Report cycles between units.
- **(rec)** Only solid `kind = import` edges. Skip `soft` seams.
- **(rec)** Mark `inCycle` on the **original file edges** that map into a cycled
  unit-pair (so the canvas still lights the real `#include` arrows, including
  `Private/*.cpp → Public/*.h` when that edge participates in a larger cycle —
  rare — and always the header↔header edges that form the cycle).
- **(rec)** Do **not** flag `Foo.cpp → Foo.h` alone.
- **(rec)** Self-include of a header (`A.h → A.h`) remains a one-unit cycle.

### What counts as one finding

- **(rec)** One finding per **SCC of logical units** with size ≥ 2, plus
  unit self-loops that survive (true self-include).
- Do not enumerate every elementary cycle.
- Message uses **unit ids** (prefer header paths) in a canonical witness cycle.
- Example: `circular include: Characters/A.h → Characters/B.h → Characters/A.h`.
- Dense SCC: `circular include: A.h → B.h → A.h (also C.h)`.
- **Accepted:** Do not list both `A.cpp` and `A.h` as separate cycle members when
  they collapsed to one unit.

### Diagnostics

- **(rec)** New `DiagnosticKind::CircularDependency` (`"circularDependency"`).
  Do **not** reuse `architectureViolation`.
- Severity: **warning**. Graph still builds (D5).
- **(rec)** Emit one diagnostic **per file module that belongs to a cycled
  unit**, so selecting either `Player.h` or `Player.cpp` shows the cycle when
  that unit is in an SCC.
  - `id`: `circularDependency:<cycle-key>:<moduleId>`
  - `cycle-key`: sorted unit ids in the SCC
  - `moduleId`: the file
  - `edgeId`: optional — a concrete import edge from that file that maps into
    the witness cycle when one exists
- Toolbar count = number of unit SCCs, not per-file diagnostic count.

### Canvas / toolbar / inspector

Same as before: `inCycle` on edges (not `isViolation`); distinct edge color;
toolbar chip next to **FacadeBypassList**; inspector colors the new kind.

### Fixtures

- **(rec)** Do not plant a cycle in `ts-basic-project` / golden.
- **(rec)** Add a small **C++/Unreal-shaped fixture** (or extend
  `tests/fixtures` Unreal mini project) with:
  - normal `Player.cpp → Player.h` (must **not** flag)
  - real `A.h ↔ B.h` cycle (must flag, message names headers)
  - optional: `A.cpp → B.h` + `B.h → A.h` (unit cycle `A`↔`B` even though only
    one header edge closes the loop from B’s side — wait: `A.cpp→B.h`, `B.h→A.h`
    is a unit cycle only if A.cpp maps to unit A and B.h→A.h maps to B→A, so
    A→B→A yes). Include this case in tests.

## Architecture

### Backend — `references` post-pass

`src-tauri/src/references/cycles.rs`:

```text
flag_cycles(edges: &mut [Edge]) -> Vec<Diagnostic>
```

Needs module path list (or derive nodes from edge endpoints) to classify
header vs impl and build stem→pair maps. If a second argument is required,
use a small struct rather than >3 params (`GUIDELINES.md`). Prefer:

```text
flag_cycles(edges: &mut [Edge], module_ids: &[String]) -> Vec<Diagnostic>
```

(2 params) or pack into `CycleInput { edges, module_ids }`.

Wire in `analysis::resolve_edges` after `flag_drift`, before soft classifiers.
Filter `EdgeKind::Import`.

Steps:

1. Index C++ headers/impls by stem among `module_ids`.
2. Map each path → unit id (paired header path, else self).
3. Project import edges to unit→unit; drop unit self-edges from pairing.
4. Tarjan/Kosaraju SCC on the unit adjacency (`BTreeMap`/`BTreeSet`).
5. Witness cycle on unit ids; diagnostics on every file in those units.
6. Set `in_cycle` on original edges whose unit-projected endpoints both lie in
   the same reported SCC (and the edge is not a dropped pair self-edge — those
   stay `in_cycle = false`).

Keep files ≤200 lines, functions ≤30 lines.

### Contract / frontend / docs

Unchanged from the previous draft except messages say **circular include** for
C++-looking cycles (or always use that wording — **(rec)** one string
`circular include: …` for all languages to avoid TS/C++ split in the UI).

Docs to update after ship: `references-analysis.md`, `contract.md`,
`graph-canvas.md`, `analyze-project.md`, new flow
`inspect-circular-dependency.md`, `current-status.md`, move this plan to
`docs/plans/done/`.

## Tests (C++-first)

- `Private/Foo.cpp → Public/Foo.h` only → **no** diagnostic.
- `A.h → B.h → A.h` → one SCC; diagnostics on both headers; both edges
  `inCycle`; message uses header paths.
- Unreal-shaped stems across Public/Private still collapse.
- `A.cpp → B.h` + `B.h → A.h` → unit cycle involving A and B; `A.cpp` and `A.h`
  both get the diagnostic; `A.cpp → A.h` pair edge (if present) not marked
  `inCycle` as the cycle cause.
- Orphan `.cpp` with no header keeps its own unit id.
- TS `a.ts ↔ b.ts` still detected (collapse no-op).
- Soft edges ignored; determinism; golden TS fixture unchanged.

## Out of scope (MVP)

- Suggesting forward declarations / how to break the cycle.
- IWYU or “this include is unused.”
- Collapsing Unreal `*.generated.h` (already hidden/external).
- Module.Build.cs dependency cycles (different graph).
- Group-level cycle badges, click-to-focus from the list, ignore allowlists.
- Auto-layout clustering of cycle members.

## Implementation order (after approval)

1. Contract: `CircularDependency` + `in_cycle`.
2. `flag_cycles` with C++ unit collapsing + Rust tests (TDD).
3. Wire `resolve_edges`; confirm golden still matches.
4. Selectors + toolbar + inspector + edge style.
5. Frontend tests + small C++ fixture if used for analysis checkpoint.
6. Docs.
7. `npx fallow audit`.

## Decisions locked

- **Collapse same-stem `.h`/`.cpp` into logical units before SCC** (accepted).

## Open question (please answer)

Should cycle detection also run on non-C++ import edges in the same pass
(TS/Rust/C# — collapsing is a no-op there) (**recommended**), or only emit
findings when at least one edge endpoint is a C++/Unreal header or impl?
