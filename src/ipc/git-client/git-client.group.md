---
id: git-client
label: Git Client
color: "#ca8a04"
icon: plug
descriptionShort: IPC to git-backed analysis
---

The GitClient seam: analyzeProjectAtRef, commit listing, ref-to-ref diffs, and working-tree diffs over Tauri IPC (or a mock for tests). Working-tree diffs accept analyzed module paths as the allowlist for ignored-aware untracked additions. The facade (index.ts) declares the interface; tauri and mock implementations are private.
