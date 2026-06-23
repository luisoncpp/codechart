// @Architecture(descriptionShort="Tauri IPC commands bridging frontend to analysis")

use crate::analysis::analyze_project as run_analysis;
use crate::contract::ProjectGraph;
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

/// Read one module's source for the L2 semantic-zoom snippet (Phase 10). `root`
/// is the analyzed folder; `path` is the module's repo-relative id. Source is
/// fetched lazily here rather than carried in the `ProjectGraph`, so the contract
/// (and the IPC payload) stays free of file bodies. Read failures surface as a
/// string error the caller can ignore (the snippet just stays empty).
#[tauri::command]
pub fn read_module_source(root: String, path: String) -> Result<String, String> {
    let source = FsProjectSource::new(&root);
    source.read_file(&path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests;
