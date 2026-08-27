// @Architecture(descriptionShort="Tauri IPC commands bridging frontend to analysis")
//
// **Every command that touches the disk, git, or the parser is `#[tauri::command(async)]`.**
// A bare `#[tauri::command]` on a synchronous function is `ExecutionContext::Blocking` in
// `tauri-macros`, which calls the body inline on the main thread: the window stops
// rendering for the duration, and two commands the frontend fires with `Promise.all`
// cannot overlap — they queue. `(async)` hands the same synchronous body to the async
// runtime instead, so the UI keeps painting and concurrent calls genuinely run at once
// (the diff visualizer loads two project snapshots this way). The body still blocks a
// runtime worker while it runs, so this buys concurrency, not unlimited concurrency.
//
// Only a command that returns a value already in memory should stay synchronous.

use crate::analysis::{analyze_project_with_options as run_analysis_with_options, AnalyzeOptions};
use crate::contract::ProjectGraph;
use crate::diff_reviews::{
    clear_diff_reviews as clear_reviews, load_diff_review as load_review,
    save_diff_review as save_review,
};
use crate::git::{self, GitCommit};
use crate::project_source::{FsProjectSource, ProjectSource};
use crate::review_notes::{
    load_review_notes as load_notes, save_review_notes as save_notes, ReviewNotesDocument,
};
use crate::{
    analysis_fs_source, ensure_unreal_defaults, read_project_config as load_project_config,
    search_sources, write_project_config as save_project_config, ProjectConfig, SearchResult,
    StartupProjectPath,
};
use std::collections::{HashMap, HashSet};

/// Return the optional project path parsed from argv at app startup.
/// Synchronous by design — it clones a `String` that was parsed before the window opened.
#[tauri::command]
pub fn get_startup_project_path(state: tauri::State<'_, StartupProjectPath>) -> Option<String> {
    state.0.clone()
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitProjectSnapshot {
    graph: ProjectGraph,
    sources: HashMap<String, String>,
}

/// Analyze the project rooted at `path` (a user-chosen folder) and return the
/// `ProjectGraph`. The path is used both as the filesystem root and as the
/// graph's recorded `root`. Build failures surface as a string error so the
/// frontend's `failed` session phase can show them.
#[tauri::command(async)]
pub fn analyze_project(
    path: String,
    metrics_window_days: Option<u32>,
    hide_top_level_dot_dirs: Option<bool>,
) -> Result<ProjectGraph, String> {
    let window_days = metrics_window_days.unwrap_or(crate::git::DEFAULT_METRICS_WINDOW_DAYS);
    if window_days == 0 {
        return Err("Metrics window must be at least one day.".to_string());
    }
    ensure_unreal_defaults(&path)?;
    let source = analysis_fs_source(&path);
    run_analysis_with_options(
        &source,
        &path,
        AnalyzeOptions {
            metrics_window_days: window_days,
            hide_top_level_dot_dirs: hide_top_level_dot_dirs.unwrap_or(true),
        },
    )
    .map_err(|e| e.to_string())
}

/// Load one git tree for both analysis and selected source extraction.
#[tauri::command(async)]
pub fn load_project_snapshot(
    path: String,
    git_ref: String,
    module_paths: Vec<String>,
    hide_top_level_dot_dirs: Option<bool>,
) -> Result<GitProjectSnapshot, String> {
    let skip_plugins = crate::should_skip_plugins_walk(&path);
    let source = git::source_at_ref(&path, &git_ref, &|file_path| {
        if skip_plugins && crate::project_config::is_under_plugins_dir(file_path) {
            return false;
        }
        crate::analysis::opens_file(file_path)
    })?;
    let graph = run_analysis_with_options(
        &source,
        &path,
        AnalyzeOptions {
            metrics_window_days: 0,
            hide_top_level_dot_dirs: hide_top_level_dot_dirs.unwrap_or(true),
        },
    )
    .map_err(|e| e.to_string())?;
    let known: HashSet<&str> = graph
        .modules
        .iter()
        .map(|module| module.path.as_str())
        .collect();
    let sources = module_paths
        .into_iter()
        .filter(|module_path| known.contains(module_path.as_str()))
        .filter_map(|module_path| {
            source
                .read_file(&module_path)
                .ok()
                .map(|body| (module_path, body))
        })
        .collect();
    Ok(GitProjectSnapshot { graph, sources })
}

#[tauri::command(async)]
pub fn git_diff_refs(path: String, base_ref: String, head_ref: String) -> Result<String, String> {
    git::diff_refs(&path, &base_ref, &head_ref)
}

#[tauri::command(async)]
pub fn git_diff_working_tree(
    path: String,
    base_ref: String,
    eligible_paths: Vec<String>,
    ignore_submodules: bool,
) -> Result<String, String> {
    git::working_tree_diff(git::WorkingTreeDiffInput {
        path: &path,
        base_ref: &base_ref,
        eligible_paths: &eligible_paths,
        ignore_submodules,
    })
}

#[tauri::command(async)]
pub fn git_list_submodule_paths(path: String) -> Result<Vec<String>, String> {
    git::list_submodule_paths(&path)
}

#[tauri::command(async)]
pub fn git_is_repo(path: String) -> bool {
    git::is_git_repo(&path)
}

#[tauri::command(async)]
pub fn git_list_commits(path: String, limit: u32) -> Result<Vec<GitCommit>, String> {
    git::list_commits(&path, limit)
}

#[tauri::command(async)]
pub fn read_module_source(root: String, path: String) -> Result<String, String> {
    let source = FsProjectSource::new(&root);
    source.read_file(&path).map_err(|e| e.to_string())
}

/// Case-insensitive substring search over the given modules' working-tree
/// sources. Unreadable files are skipped, so there is no failure mode.
#[tauri::command(async)]
pub fn search_module_sources(
    root: String,
    query: String,
    module_paths: Vec<String>,
) -> SearchResult {
    let source = FsProjectSource::new(&root);
    search_sources(&source, &query, &module_paths)
}

#[tauri::command(async)]
pub fn read_project_config(path: String) -> Result<ProjectConfig, String> {
    load_project_config(&path)
}

#[tauri::command(async)]
pub fn write_project_config(path: String, config: ProjectConfig) -> Result<(), String> {
    save_project_config(&path, config)
}

#[tauri::command(async)]
pub fn load_review_notes(
    root: String,
    module_paths: Vec<String>,
) -> Result<ReviewNotesDocument, String> {
    load_notes(&root, module_paths)
}

#[tauri::command(async)]
pub fn save_review_notes(root: String, document: ReviewNotesDocument) -> Result<(), String> {
    save_notes(&root, document)
}

/// Reviewed file paths for one diff, reconciled against the diff's current
/// paths (stale entries are dropped and the result persisted).
#[tauri::command(async)]
pub fn load_diff_review(
    root: String,
    diff_id: String,
    diff_paths: Vec<String>,
) -> Result<Vec<String>, String> {
    load_review(&root, &diff_id, diff_paths)
}

#[tauri::command(async)]
pub fn save_diff_review(
    root: String,
    diff_id: String,
    reviewed_paths: Vec<String>,
) -> Result<(), String> {
    save_review(&root, &diff_id, reviewed_paths)
}

/// Wipe every persisted diff review entry (settings "clear review info").
#[tauri::command(async)]
pub fn clear_diff_reviews(root: String) -> Result<(), String> {
    clear_reviews(&root)
}

/// Toggle the webview developer tools (inspector).
#[tauri::command]
pub fn toggle_devtools(window: tauri::WebviewWindow) {
    if window.is_devtools_open() {
        window.close_devtools();
    } else {
        window.open_devtools();
    }
}

#[cfg(test)]
mod tests;
