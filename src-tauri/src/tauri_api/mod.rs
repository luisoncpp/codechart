// @Architecture(descriptionShort="Tauri IPC commands bridging frontend to analysis")

use crate::analysis::analyze_project as run_analysis;
use crate::contract::ProjectGraph;
use crate::git::{self, GitCommit};
use crate::project_source::{FsProjectSource, ProjectSource};
use crate::{
    ensure_unreal_defaults, read_project_config as load_project_config,
    write_project_config as save_project_config, ProjectConfig,
};
use std::collections::HashMap;

/// Analyze the project rooted at `path` (a user-chosen folder) and return the
/// `ProjectGraph`. The path is used both as the filesystem root and as the
/// graph's recorded `root`. Build failures surface as a string error so the
/// frontend's `failed` session phase can show them.
#[tauri::command]
pub fn analyze_project(path: String) -> Result<ProjectGraph, String> {
    ensure_unreal_defaults(&path)?;
    let source = FsProjectSource::new(&path);
    run_analysis(&source, &path).map_err(|e| e.to_string())
}

/// Analyze the project as it existed at a git ref (commit, branch, tag).
#[tauri::command]
pub fn analyze_project_at_ref(path: String, git_ref: String) -> Result<ProjectGraph, String> {
    let source = git::source_at_ref(&path, &git_ref)?;
    run_analysis(&source, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_diff_refs(path: String, base_ref: String, head_ref: String) -> Result<String, String> {
    git::diff_refs(&path, &base_ref, &head_ref)
}

/// Read selected module bodies from one snapshot without loading it once per file.
#[tauri::command]
pub fn read_module_sources_at_ref(
    path: String,
    git_ref: String,
    module_paths: Vec<String>,
) -> Result<HashMap<String, String>, String> {
    let source = git::source_at_ref(&path, &git_ref)?;
    module_paths
        .into_iter()
        .map(|module_path| {
            source
                .read_file(&module_path)
                .map(|body| (module_path, body))
                .map_err(|error| error.to_string())
        })
        .collect()
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

#[tauri::command]
pub fn read_project_config(path: String) -> Result<ProjectConfig, String> {
    load_project_config(&path)
}

#[tauri::command]
pub fn write_project_config(path: String, config: ProjectConfig) -> Result<(), String> {
    save_project_config(&path, config)
}

#[cfg(test)]
mod tests;
