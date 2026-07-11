---
id: git-client
label: Git Client
color: "#ca8a04"
icon: plug
descriptionShort: IPC to git-backed analysis
---

The GitClient seam: analyzeProjectAtRef, batched module-source reads at a ref, commit listing, ref-to-ref diffs, and working-tree diffs over Tauri IPC (or a mock for tests). Batched source reads load one snapshot once and support source-range-aware L1.5 symbol diffs. Working-tree diffs accept analyzed module paths as the allowlist for ignored-aware untracked additions. The facade (index.ts) declares the interface; tauri and mock implementations are private.
