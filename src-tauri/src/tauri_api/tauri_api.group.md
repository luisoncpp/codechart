---
id: tauri_api
label: Tauri API
color: "#16a34a"
icon: plug
facades:
  - mod.rs
descriptionShort: Tauri IPC command handlers
---

Exposes `analyze_project` and `read_module_source` to the frontend. Build failures surface as string errors for the session's `failed` phase; source reads stay lazy outside the contract.
