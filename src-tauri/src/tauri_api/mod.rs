// @Architecture(descriptionShort="Tauri IPC commands bridging frontend to analysis")

use crate::analysis::{
    analyze_project as run_analysis,
    analyze_project_with_metrics_window as run_analysis_with_metrics_window,
};
use crate::contract::ProjectGraph;
use crate::git::{self, GitCommit};
use crate::project_source::{FsProjectSource, ProjectSource};
use crate::review_notes::{
    load_review_notes as load_notes, save_review_notes as save_notes, ReviewNotesDocument,
};
use crate::{
    ensure_unreal_defaults, read_project_config as load_project_config, search_sources,
    write_project_config as save_project_config, ProjectConfig, SearchResult,
};
use std::collections::{HashMap, HashSet};

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
#[tauri::command]
pub fn analyze_project(
    path: String,
    metrics_window_days: Option<u32>,
) -> Result<ProjectGraph, String> {
    let window_days = metrics_window_days.unwrap_or(crate::git::DEFAULT_METRICS_WINDOW_DAYS);
    if window_days == 0 {
        return Err("Metrics window must be at least one day.".to_string());
    }
    ensure_unreal_defaults(&path)?;
    let source = FsProjectSource::new(&path);
    run_analysis_with_metrics_window(&source, &path, window_days).map_err(|e| e.to_string())
}

/// Load one git tree for both analysis and selected source extraction.
#[tauri::command]
pub fn load_project_snapshot(
    path: String,
    git_ref: String,
    module_paths: Vec<String>,
) -> Result<GitProjectSnapshot, String> {
    let source = git::source_at_ref(&path, &git_ref)?;
    let graph = run_analysis(&source, &path).map_err(|e| e.to_string())?;
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

#[tauri::command]
pub fn git_diff_refs(path: String, base_ref: String, head_ref: String) -> Result<String, String> {
    git::diff_refs(&path, &base_ref, &head_ref)
}

#[tauri::command]
pub fn git_diff_working_tree(
    path: String,
    base_ref: String,
    eligible_paths: Vec<String>,
) -> Result<String, String> {
    git::working_tree_diff(&path, &base_ref, &eligible_paths)
}

#[tauri::command]
pub fn git_is_repo(path: String) -> bool {
    git::is_git_repo(&path)
}

#[tauri::command]
pub fn git_list_commits(path: String, limit: u32) -> Result<Vec<GitCommit>, String> {
    git::list_commits(&path, limit)
}

#[tauri::command]
pub fn read_module_source(root: String, path: String) -> Result<String, String> {
    let source = FsProjectSource::new(&root);
    source.read_file(&path).map_err(|e| e.to_string())
}

/// Case-insensitive substring search over the given modules' working-tree
/// sources. Unreadable files are skipped, so there is no failure mode.
#[tauri::command]
pub fn search_module_sources(
    root: String,
    query: String,
    module_paths: Vec<String>,
) -> SearchResult {
    let source = FsProjectSource::new(&root);
    search_sources(&source, &query, &module_paths)
}

#[tauri::command]
pub fn read_project_config(path: String) -> Result<ProjectConfig, String> {
    load_project_config(&path)
}

#[tauri::command]
pub fn write_project_config(path: String, config: ProjectConfig) -> Result<(), String> {
    save_project_config(&path, config)
}

#[tauri::command]
pub fn load_review_notes(root: String, module_paths: Vec<String>) -> Result<ReviewNotesDocument, String> {
    load_notes(&root, module_paths)
}

#[tauri::command]
pub fn save_review_notes(root: String, document: ReviewNotesDocument) -> Result<(), String> {
    save_notes(&root, document)
}

#[cfg(test)]
mod tests;
