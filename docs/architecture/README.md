# Architecture Docs

Canonical technical guides — the single source of truth for each subsystem's design, data model, and behavior rules.

Covers only what's already implemented. For architecture docs of not implemented yet, check `docs/plans`

| File | Subsystem | Notes |
|------|-----------|-------|
| [contract.md](./contract.md) | `ProjectGraph` contract + `ProjectGraphBuilder` invariants | The IPC data shape; golden-fixture North Star |
| [language-adapter.md](./language-adapter.md) | `LanguageAdapter` seam (TS adapter) + `semantic_comments` | One file → `ParsedModule`; `@Architecture` parsing |
| [config-grouping.md](./config-grouping.md) | `project_config` (`*.group.md`) + `grouping` (`resolve_groups`) | Files + config → nested group tree, facades, configErrors |
| [unreal-config.md](./unreal-config.md) | project config + `unreal_config` + Settings modals | Project-local editor, C++ include paths, generated-file hiding, Unreal engine exclusion |
| [references-analysis.md](./references-analysis.md) | `references` (`resolve_references`) + `diagnostics` + `analysis` (`analyze_project`) | Imports → edges + diagnostics; full backend pipeline → golden `ProjectGraph` |
| [layout.md](./layout.md) | `domain/layout` (`LayoutEngine` + `ElkLayoutEngine`) | `ProjectGraph` → `LayoutedGraph` (absolute nested boxes) via elkjs; deterministic |
| [graph-canvas.md](./graph-canvas.md) | `GraphProjector` + `features/graph_canvas` (React Flow) + `inspection_panel` + session selection/layout | `ProjectGraph` + layout → rendered map (sample aesthetic) + selection-driven inspection |
| [wiki-links.md](./wiki-links.md) | `wiki_links/` + preview-frame open | `[[path]]` / `[[path#Section]]` in comments and docs → preview; `@Section` / ATX fragments |
| [shell-client.md](./shell-client.md) | `ipc/shell-client` | Open a module in the configured editor or reveal it in the OS explorer via Tauri opener plugin |
| [unity-prefabs.md](./unity-prefabs.md) | `unity_assets` + `unity_prefab` adapter + `references::unity` | `.prefab` YAML → script/nested-prefab soft edges; serialized fields as `exportedSymbols` |
| [review-notes.md](./review-notes.md) | project-local Review Notes | Versioned persistence, reconciliation, inline notes, badges, and sidebar navigation |
| [diff-reviews.md](./diff-reviews.md) | project-local Diff Reviews | Per-diff reviewed-file checkmarks: identity, reconciliation, canvas toggles, and progress checklist |
| [diff-notes.md](./diff-notes.md) | Diff Notes | Read-only markdown explanations consumed from `#` marker lines in pasted diffs |
| [project-search.md](./project-search.md) | `search` (Rust) + `project_search` find bar | Ctrl+Shift+F content search, Ctrl+P file search, and Search ▾ exported-symbol search; match navigation via `focusOn` |

