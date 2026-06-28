// @Architecture(descriptionShort="Tauri IPC commands bridging frontend to analysis")

use crate::analysis::analyze_project as run_analysis;
use crate::contract::ProjectGraph;
use crate::git::{self, GitCommit};
use crate::project_source::{FsProjectSource, ProjectSource};

/// Analyze the project rooted at `path` (a user-chosen folder) and return the
/// `ProjectGraph`. The path is used both as the filesystem root and as the
/// graph's recorded `root`. Build failures surface as a string error so the
/// frontend's `failed` session phase can show them.
#[tauri::command]
pub fn analyze_project(path: String) -> Result<ProjectGraph, String> {
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

#[cfg(test)]
mod tests;
