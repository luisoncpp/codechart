---
id: git-client
label: Git Client
color: "#ca8a04"
icon: plug
descriptionShort: IPC to git-backed analysis
---

The GitClient seam: analyzeProjectAtRef, diffRefs, and commit listing over Tauri IPC (or a mock for tests). The facade (index.ts) declares the interface; tauri and mock implementations are private.
