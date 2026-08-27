// @Architecture(descriptionShort="Options controlling metrics window and top-level dot-dir filtering")

/// Session/analysis knobs that affect which files enter the graph.
pub struct AnalyzeOptions {
    /// Git lookback for churn/bug-risk. `0` skips the git probe entirely (CI `check`, snapshots).
    pub metrics_window_days: u32,
    /// Drop files under top-level directories whose names start with `.`.
    pub hide_top_level_dot_dirs: bool,
}

impl Default for AnalyzeOptions {
    fn default() -> Self {
        Self {
            metrics_window_days: crate::git::DEFAULT_METRICS_WINDOW_DAYS,
            hide_top_level_dot_dirs: true,
        }
    }
}
