---
id: analysis-client
label: Analysis Client
color: "#ea580c"
icon: bolt
descriptionShort: IPC to the backend analyzer
---

The AnalysisClient seam: analyzeProject(path) → ProjectGraph, with Tauri and mock implementations. The facade (index.ts) declares the interface; the concrete clients are private.
