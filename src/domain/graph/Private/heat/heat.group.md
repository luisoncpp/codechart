---
id: graph_heat
label: Heatmap Scores
color: "#c026d3"
icon: bolt
descriptionShort: Git-metric heat scores & gradient colors
---

Activity/risk heatmap math: percentile-ranks visible modules from `ModuleMetrics` git metrics, or Martin instability `Ce/(Ce+Ca)` from unique solid-import neighbors, into `[0,1]` heat scores (`computeHeatProjection`). Group scores roll up from the full graph. Scores map to per-mode gradient colors and legend stops. Instability does not use git.
