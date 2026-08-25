---
id: tauri
label: Tauri Backend
color: "#dc2626"
icon: server
groups:
  - backend_shell
  - analysis
  - contract
  - diagnostics
  - diff_reviews_backend
  - git
  - grouping
  - language_adapter
  - project_config
  - project_source
  - references
  - review_notes_backend
  - semantic_comments
  - tauri_api
  - tsconfig_paths
  - unity_assets
  - cli
descriptionShort: Rust analysis backend
---

Composes the backend pipeline — config, adapters, grouping, references, diagnostics — into the `ProjectGraph` contract exposed over Tauri IPC. Child groups map to `src-tauri/src/` deep modules; the CLI inspects intermediate output headlessly.
