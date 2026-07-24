# Flow — Change the metrics timeframe

1. **Trigger** — with the heatmap visible, the user clicks **Last N days** in the canvas legend.
2. **Entry point** — `HeatmapLegend` opens `MetricsWindowModal`.

## Sequence

| # | Step | Owner |
|---|------|-------|
| 1 | Validate a positive whole number of days | `MetricsWindowModal` |
| 2 | Reanalyze the loaded root with the new window | `GraphSessionStore.setMetricsWindowDays` |
| 3 | Send `metricsWindowDays` through `AnalysisClient` and Tauri `analyze_project` | `ipc/analysis-client`, `tauri_api` |
| 4 | Query `git log --since=N.days.ago` and rebuild module metrics | `git::metrics_log`, `git::metrics` |
| 5 | Replace the session graph, recompute layout, and update legend/inspector labels | `GraphSessionStore` |

The initial window is 90 days. Reloading the same root keeps the selected value; opening a different
root resets it to 90. Invalid values and failed analysis leave the previous graph and window intact.
