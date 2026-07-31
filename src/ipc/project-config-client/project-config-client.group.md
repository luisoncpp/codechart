---
id: project-config-client
label: Project Config Client
color: "#2563eb"
icon: plug
descriptionShort: IPC to project-level config persistence
---

The ProjectConfigClient seam: read/write project-local editor selection and Unreal C++ engine include paths over Tauri IPC (or a mock for tests). The facade (index.ts) declares the interface; tauri and mock implementations are private.
