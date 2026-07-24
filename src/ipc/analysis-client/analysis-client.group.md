---
id: analysis-client
label: Analysis Client
color: "#ea580c"
icon: bolt
descriptionShort: IPC to the backend analyzer
---

The AnalysisClient seam: analyzeProject(path, metricsWindowDays) → ProjectGraph, with Tauri and mock implementations. The facade (index.ts) declares the interface and 90-day default; the concrete clients are private.
