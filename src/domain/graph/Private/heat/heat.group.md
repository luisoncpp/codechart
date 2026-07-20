---
id: graph_heat
label: Heatmap Scores
color: "#c026d3"
icon: bolt
descriptionShort: Git-metric heat scores & gradient colors
---

Activity/risk heatmap math: percentile-ranks visible modules from `ModuleMetrics` git metrics into `[0,1]` heat scores (`computeHeatProjection`), rolls group scores up from the full graph, and maps scores to gradient colors and legend stops.
