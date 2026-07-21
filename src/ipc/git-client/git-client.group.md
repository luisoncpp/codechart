---
id: git-client
label: Git Client
color: "#ca8a04"
icon: plug
descriptionShort: IPC to git-backed analysis
---

The GitClient seam: combined project-graph/selected-source snapshot loads at a ref, commit listing, ref-to-ref diffs, and working-tree diffs over Tauri IPC (or a mock for tests). A historical tree is loaded once per ref and supports source-range-aware L1.5 symbol diffs without a second full-tree read. Working-tree diffs accept analyzed module paths as the allowlist for ignored-aware untracked additions. The facade (index.ts) declares the interface; tauri and mock implementations are private.
