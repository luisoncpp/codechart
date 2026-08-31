# Flow — Inspect a circular dependency

When a module participates in an import cycle, select it to read the cycle in the
inspection panel; cycle edges render red on the canvas (same `isViolation` stroke
as facade bypasses).

## Trigger

User selects a module that belongs to a cycled **logical unit** (after analyze).

## Entry point

`InspectionPanel` → `ModuleInspection` → `DiagnosticsList`
(`features/inspection_panel`).

## Step-by-step

| # | Step | Where |
|---|------|-------|
| 1 | Backend `flag_cycles` marks cycle import edges `isViolation` and emits `circularDependency` per participating file | `references/cycles.rs`, wired in `analysis::resolve_edges` after `flag_drift` |
| 2 | Canvas paints red import edges where `isViolation` | `styleEdge` (no cycle-specific branch) |
| 3 | Toolbar chip **N architecture issues** lists bypass + deduped cycle rows (`architectureViolations`) | `FacadeBypassList`, `selectors.ts` |
| 4 | User selects a module on the canvas | `GraphSessionStore.select` |
| 5 | `diagnosticsFor(graph, moduleId)` returns all diagnostics for that file | `selectors.ts` |
| 6 | `circularDependency` rows render **red** with message `circular include (N modules): …` | `DiagnosticsList.tsx` |

## Reads

- In-memory `ProjectGraph` (diagnostics + edges).

## Writes

- None.

## Files to inspect

- `src-tauri/src/references/cycles.rs` — diagnostics + edge flagging + message text
- `src-tauri/src/references/rust.rs` — parent/`mod.rs` ↔ direct-child pair skip
- `src-tauri/src/references/cycle_scc.rs` — Tarjan SCC
- `src-tauri/src/references/cycle_witness.rs` — hub-shortest elementary witness
- `src/domain/graph/Private/selectors.ts` — `architectureViolations`, `diagnosticsFor`
- `src/features/inspection_panel/Private/DiagnosticsList.tsx` — red styling
- `src/features/project_loader/Private/FacadeBypassList.tsx` — toolbar list

## Common failure modes

- **Cycle on canvas but no panel text** → file not in `module_ids` passed to `flag_cycles`, or diagnostic `moduleId` mismatch.
- **Two toolbar rows for one cycle** → `architectureViolations` should dedupe by `cycle-key` in the diagnostic id.
- **Red `Foo.cpp → Foo.h` edge** → pair self-edge incorrectly flagged; should stay grey.
- **Red `mod.rs → child.rs` (or `lib.rs ↔ tests.rs`)** → Rust parent–direct-child pair incorrectly flagged; should stay grey. Sibling `A.rs ↔ B.rs` under the same facade should still go red.
- **Unrolled / fabricated chain** → witness must stay elementary (`cycle_witness`); inbound-only predecessors must not appear.
- **Huge `others in this cycle` list** → those ids are co-members of the SCC (often via a hub like a character/controller unit), not “unrelated extras”; the `(N modules)` headline is the size signal.
