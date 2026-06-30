# Architecture Docs

Canonical technical guides — the single source of truth for each subsystem's design, data model, and behavior rules.

Covers only what's already implemented. For architecture docs of not implemented yet, check `docs/plans`

| File | Subsystem | Notes |
|------|-----------|-------|
| [contract.md](./contract.md) | `ProjectGraph` contract + `ProjectGraphBuilder` invariants | The IPC data shape; golden-fixture North Star |
| [language-adapter.md](./language-adapter.md) | `LanguageAdapter` seam (TS adapter) + `semantic_comments` | One file → `ParsedModule`; `@Architecture` parsing |
| [config-grouping.md](./config-grouping.md) | `project_config` (`*.group.md`) + `grouping` (`resolve_groups`) | Files + config → nested group tree, facades, configErrors |
| [unreal-config.md](./unreal-config.md) | `unreal_config` + C++ include-root resolution + config modal | Project-local Unreal include paths, generated-file hiding, engine exclusion |
| [references-analysis.md](./references-analysis.md) | `references` (`resolve_references`) + `diagnostics` + `analysis` (`analyze_project`) | Imports → edges + diagnostics; full backend pipeline → golden `ProjectGraph` |
| [layout.md](./layout.md) | `domain/layout` (`LayoutEngine` + `ElkLayoutEngine`) | `ProjectGraph` → `LayoutedGraph` (absolute nested boxes) via elkjs; deterministic |
| [graph-canvas.md](./graph-canvas.md) | `GraphProjector` + `features/graph_canvas` (React Flow) + `inspection_panel` + session selection/layout | `ProjectGraph` + layout → rendered map (sample aesthetic) + selection-driven inspection |
| [shell-client.md](./shell-client.md) | `ipc/shell-client` | Reveal a module file in the OS explorer via Tauri opener plugin |
| [unity-prefabs.md](./unity-prefabs.md) | `unity_assets` + `unity_prefab` adapter + `references::unity` | `.prefab` YAML → script/nested-prefab soft edges; serialized fields as `exportedSymbols` |
