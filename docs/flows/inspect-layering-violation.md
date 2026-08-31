# Flow — Inspect a layering violation

When a group’s `mustNotImport` / `mayImport` rule is broken, select the importer
to read the layering diagnostic; the solid import edge is red (`isViolation`),
same stroke as facade bypass and cycles.

## Trigger

User selects a module whose outbound import violates a group layering rule
(after analyze). Typical case: `db` lists `mustNotImport: [ui]` and a `db`
module imports a `ui` facade.

## Entry point

`InspectionPanel` → `ModuleInspection` → `DiagnosticsList`
(`features/inspection_panel`).

## Step-by-step

| # | Step | Where |
|---|------|-------|
| 1 | Backend `flag_layering` marks violating solid import edges `isViolation` and emits `architectureViolation` with id `architectureViolation:layer:<edge-id>` | `references/layering.rs`, wired in `analysis::resolve_edges` after `flag_drift` |
| 2 | Canvas paints red import edges where `isViolation` | `styleEdge` (no layering-specific branch) |
| 3 | Toolbar chip **N architecture issues** lists the diagnostic (`architectureViolations`) | `FacadeBypassList`, `selectors.ts` |
| 4 | User selects the importer module on the canvas | `GraphSessionStore.select` |
| 5 | `diagnosticsFor(graph, moduleId)` returns diagnostics for that file | `selectors.ts` |
| 6 | `architectureViolation` rows render **red** with message `… violating layering: <from> must not import <to>` (or `may not import`) | `DiagnosticsList.tsx` |

## Reads

- In-memory `ProjectGraph` (diagnostics + edges).
- `*.group.md` frontmatter `mustNotImport` / `mayImport` (already resolved into
  the graph’s diagnostics; not re-read by the UI).

## Writes

- None.

## Files to inspect

- `src-tauri/src/project_config/parse.rs` — YAML fields
- `src-tauri/src/grouping/layering.rs` — unknown group ids → `configError`
- `src-tauri/src/references/layering.rs` — diagnostics + edge flagging
- `src-tauri/src/analysis/mod.rs` — `resolve_edges` wiring
- `src/domain/graph/Private/selectors.ts` — `architectureViolations`, `diagnosticsFor`
- `src/features/inspection_panel/Private/DiagnosticsList.tsx` — red styling
- `src/features/project_loader/Private/FacadeBypassList.tsx` — toolbar list

## Common failure modes

- **Grey edge into a public facade** → layering is independent of facades; confirm the importer group (or an ancestor) actually declares the rule, and that the target group id matches (or is a descendant of the named target).
- **Sibling groups under `app` unexpectedly red** → a parent `mayImport` does **not** forbid children importing each other; put `mustNotImport` on the sibling (`db`, not `app`).
- **Nested file not flagged** → rules inherit down the importer tree and named targets include descendants; if it still misses, the module may be ungrouped or a test importer (`*.test.*` / `test` segments are skipped).
- **Two red reasons on one edge** → bypass (`architectureViolation:<edge-id>`) and layering (`architectureViolation:layer:<edge-id>`) can both apply; both should appear in the panel.
- **`configError:layer:…` and no red edge** → unknown group id in the YAML; the bad name is dropped and never flagged.
